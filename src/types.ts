export interface SocialLink {
  name: string;
  url: string;
  icon: string;
}

export interface Project {
  title: string;
  description: string;
  tech: string[];
  images?: string[];
  url?: string;
  category?: 'Security' | 'Creative' | 'Development';
  repository?: string;
  language?: string;
}

export interface Experience {
  title: string;
  meta: string;
  description: string;
  image?: string;
  images?: string[];
}

export interface Education {
  title: string;
  meta: string;
  description: string;
  logo: string;
}

export interface TechSkill {
  name: string;
  icon: string;
  desc: string;
}

export interface SectionData {
  id: string;
  label: string;
}
