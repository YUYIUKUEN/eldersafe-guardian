export type VolunteerRegisterInput = {
  name: string;
  phone: string;
  email: string;
  password: string;
  age: number;
  serviceAreas: string[];
  bio: string;
  consent: true;
};

export type VolunteerRegisterInputLoose = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  password?: unknown;
  age?: unknown;
  serviceAreas?: unknown;
  bio?: unknown;
  consent?: unknown;
};

export type PasswordStrength = "too_short" | "weak" | "fair" | "good" | "strong";
