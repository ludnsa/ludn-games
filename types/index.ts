// أنواع بيانات الحسابات (Profiles)
export interface UserProfile {
  id?: string;
  full_name: string;
  phone_number?: string;
  email?: string;
  available_tokens?: number;
}

// أنواع بيانات مكتبة الألعاب للمستخدم
export interface UserGame {
  id?: string;
  user_id: string;
  game_id: string;
  is_purchased: boolean;
  games_played: number;
}

export interface WDQuestion {
  q: string;
  options: string[];
  a: string;
}

// أنواع بيانات دول لعبة السيطرة على العالم (مبدئي)
export interface WDCountry {
  id: string;
  geoId: string;
  name: string;
  isActive: boolean;
  isChallenge: boolean;
  owner: 1 | 2 | null;
  lastOwner: 1 | 2 | null;
  value: number;
  originalValue: number;
  activeQuestion?: WDQuestion | null; 
  questions: WDQuestion[];
  forbiddenFor?: number[];
  isStolen?: boolean;
  wasOwnedBefore?: boolean;
}

export interface CWQuestion {
  q: string;
  options?: string[];
  a: string;
}