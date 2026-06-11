export interface SignFromBase {
  email: string;
  password: string;
}

export interface SignUpFormValue extends SignFromBase {
  confirmPassword: string;
}

export interface SignInFormValue extends SignFromBase {}

export interface ForgotPasswordFormValue {
  email: string;
}