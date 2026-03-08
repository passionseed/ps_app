export type OnboardingStep =
  | "profile"
  | "chat"
  | "interests"
  | "careers"
  | "settings";

export type ChatMessage = {
  role: "user" | "model";
  parts: [{ text: string }];
};

export type InterestCategory = {
  id?: string;
  category_name: string;
  statements: string[];
  selected: string[];
};

export type CareerGoal = {
  career_name: string;
  source: "ai_suggested" | "user_typed";
};

export type MobileSettings = {
  push_enabled: boolean;
  reminder_time: string; // "HH:MM" e.g. "09:00"
  theme: "light" | "dark";
};

export type OnboardingState = {
  current_step: OnboardingStep;
  chat_history: ChatMessage[];
  collected_data: Partial<CollectedData>;
};

export type CollectedData = {
  education_level: "high_school" | "university" | "unaffiliated";
  school_name?: string;
  preferred_language: "en" | "th";
  date_of_birth?: string; // ISO date string YYYY-MM-DD
};

export type OnboardingChatResponse = {
  message: string;
  action:
    | null
    | "transition_to_interests"
    | "show_interest_categories"
    | "show_career_suggestions";
  action_data?: {
    categories?: { name: string; statements: string[] }[];
    careers?: string[];
  };
};

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  education_level: "high_school" | "university" | "unaffiliated";
  preferred_language: "en" | "th";
  school_name: string | null;
  is_onboarded: boolean;
  onboarded_at: string | null;
  mobile_settings: MobileSettings | null;
  expo_push_token: string | null;
};
