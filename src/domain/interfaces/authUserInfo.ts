export default interface AuthUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  nickname?: string;
  preferred_username?: string;
  profile?: string;
  picture?: string;
  website?: string;
  email: string;
  email_verified?: boolean;
  gender?: string;
  birthdate?: string;
  zoneinfo?: string;
  locale?: string;
  phone_number?: string;
  phone_number_verified?: boolean;
  address?: {
    country?: string;
  };
  aud: string;
  iss: string;
  sid: string;
}
