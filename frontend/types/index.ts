export interface Suggestion {
  location: string;
  title: string;
  description: string;
  type: string;
}

export interface LearningResource {
  title: string;
  type: string;
  link: string;
}

export interface DashboardData {
  analysis: {
    locations_found: string[];
    activities_found: string[];
  };
  dashboard: {
    suggestions: Suggestion[];
    tasks: string[];
    learning: LearningResource[];
  };
}
