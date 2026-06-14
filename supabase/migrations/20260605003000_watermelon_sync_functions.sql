-- Utility helpers to convert between WatermelonDB millisecond epochs and PostgreSQL timestamps.
create or replace function public.timestamp_to_epoch(ts timestamptz)
returns bigint
language sql
immutable
as $$
	select floor(extract(epoch from ts) * 1000)::bigint;
$$;

create or replace function public.epoch_to_timestamp(epoch bigint)
returns timestamptz
language sql
immutable
as $$
	select timestamp with time zone 'epoch' + (epoch * interval '1 millisecond');
$$;

-- Pull local sync changes for the authenticated user's profile only.
create or replace function public.pull(last_pulled_at bigint default 0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_last_pulled_at timestamptz := public.epoch_to_timestamp(last_pulled_at);
	v_changes jsonb;
	v_timestamp bigint := public.timestamp_to_epoch(now());
begin
	select jsonb_build_object(
		'profiles', jsonb_build_object(
			'created', coalesce(
				jsonb_agg(
					jsonb_build_object(
						'id', p.id,
						'name', p.name,
						'email', p.email,
						'phone_number', p.phone_number,
						'avatar', p.avatar,
						'is_deleted', p.is_deleted,
						'created_at', public.timestamp_to_epoch(p.created_at),
						'updated_at', public.timestamp_to_epoch(p.updated_at),
						'deleted_at', case when p.deleted_at is null then null else public.timestamp_to_epoch(p.deleted_at) end
					)
				) filter (
					where p.id = auth.uid()
						and p.created_at > v_last_pulled_at
						and p.deleted_at is null
				),
				'[]'::jsonb
			),
			'updated', coalesce(
				jsonb_agg(
					jsonb_build_object(
						'id', p.id,
						'name', p.name,
						'email', p.email,
						'phone_number', p.phone_number,
						'avatar', p.avatar,
						'is_deleted', p.is_deleted,
						'created_at', public.timestamp_to_epoch(p.created_at),
						'updated_at', public.timestamp_to_epoch(p.updated_at),
						'deleted_at', case when p.deleted_at is null then null else public.timestamp_to_epoch(p.deleted_at) end
					)
				) filter (
					where p.id = auth.uid()
						and p.created_at <= v_last_pulled_at
						and p.updated_at > v_last_pulled_at
						and p.deleted_at is null
				),
				'[]'::jsonb
			),
			'deleted', coalesce(
				jsonb_agg(to_jsonb(p.id)) filter (
					where p.id = auth.uid()
						and p.deleted_at is not null
						and p.updated_at > v_last_pulled_at
				),
				'[]'::jsonb
			)
		)
	)
	into v_changes
	from public.profiles p
	where p.id = auth.uid();

	return jsonb_build_object(
		'changes', coalesce(v_changes, jsonb_build_object('profiles', jsonb_build_object('created', '[]'::jsonb, 'updated', '[]'::jsonb, 'deleted', '[]'::jsonb))),
		'timestamp', v_timestamp
	);
end;
$$;

-- Push local WatermelonDB profile mutations back to Supabase for the authenticated user only.
create or replace function public.push(changes jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	new_profile jsonb;
	updated_profile jsonb;
	deleted_profile_id uuid;
	v_profile_id uuid := auth.uid();
begin
	for new_profile in
		select value
		from jsonb_array_elements(coalesce(changes->'profiles'->'created', '[]'::jsonb)) as value
	loop
		if (new_profile->>'id')::uuid <> v_profile_id then
			raise exception 'profiles push is only allowed for the authenticated user';
		end if;

		insert into public.profiles (
			id,
			name,
			email,
			phone_number,
			avatar,
			is_deleted,
			created_at,
			updated_at,
			deleted_at
		)
		values (
			(new_profile->>'id')::uuid,
			coalesce(new_profile->>'name', ''),
			new_profile->>'email',
			nullif(new_profile->>'phone_number', ''),
			nullif(new_profile->>'avatar', ''),
			coalesce((new_profile->>'is_deleted')::boolean, false),
			public.epoch_to_timestamp(coalesce((new_profile->>'created_at')::bigint, public.timestamp_to_epoch(now()))),
			public.epoch_to_timestamp(coalesce((new_profile->>'updated_at')::bigint, public.timestamp_to_epoch(now()))),
			case
				when new_profile ? 'deleted_at' and new_profile->>'deleted_at' is not null
				then public.epoch_to_timestamp((new_profile->>'deleted_at')::bigint)
				else null
			end
		)
		on conflict (id) do update set
			name = excluded.name,
			email = excluded.email,
			phone_number = excluded.phone_number,
			avatar = excluded.avatar,
			is_deleted = excluded.is_deleted,
			created_at = excluded.created_at,
			updated_at = excluded.updated_at,
			deleted_at = excluded.deleted_at;
	end loop;

	for updated_profile in
		select value
		from jsonb_array_elements(coalesce(changes->'profiles'->'updated', '[]'::jsonb)) as value
	loop
		if (updated_profile->>'id')::uuid <> v_profile_id then
			raise exception 'profiles push is only allowed for the authenticated user';
		end if;

		update public.profiles
		set
			name = coalesce(updated_profile->>'name', name),
			email = coalesce(updated_profile->>'email', email),
			phone_number = nullif(updated_profile->>'phone_number', ''),
			avatar = nullif(updated_profile->>'avatar', ''),
			is_deleted = coalesce((updated_profile->>'is_deleted')::boolean, is_deleted),
			created_at = public.epoch_to_timestamp(coalesce((updated_profile->>'created_at')::bigint, public.timestamp_to_epoch(created_at))),
			updated_at = public.epoch_to_timestamp(coalesce((updated_profile->>'updated_at')::bigint, public.timestamp_to_epoch(now()))),
			deleted_at = case
				when updated_profile ? 'deleted_at' and updated_profile->>'deleted_at' is not null
				then public.epoch_to_timestamp((updated_profile->>'deleted_at')::bigint)
				else deleted_at
			end
		where id = v_profile_id;
	end loop;

	for deleted_profile_id in
		select jsonb_array_elements_text(coalesce(changes->'profiles'->'deleted', '[]'::jsonb))::uuid
	loop
		if deleted_profile_id <> v_profile_id then
			raise exception 'profiles push is only allowed for the authenticated user';
		end if;

		update public.profiles
		set
			is_deleted = true,
			deleted_at = now(),
			updated_at = now()
		where id = deleted_profile_id;
	end loop;
end;
$$;