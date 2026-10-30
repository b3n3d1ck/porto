import type { SocialLink, Project, Experience, Education, TechSkill, SectionData } from '../types';
import githubProjects from './github-projects.json';

export const personalData = {
  name: "Abraham Benedick",
  job: "Interested in pentesting and cyber security, experienced with web security, webshell/backdoor (ethical), DDoS testing & developer, and pentesting tool. Familiar with PHP and full-stack web tech.",
  email: "abrahamtelkombandung@gmail.com",
  socials: [
    { name: 'GitHub', url: 'https://github.com/b3n3d1ck', icon: `<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 .297a12 12 0 00-3.793 23.385c.6.111.82-.261.82-.577v-2.234c-3.338.726-4.043-1.416-4.043-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.776.418-1.305.762-1.605-2.665-.304-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.323 3.301 1.23a11.52 11.52 0 016.006 0c2.291-1.553 3.297-1.23 3.297-1.23.653 1.652.242 2.873.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.216.694.825.576A12.001 12.001 0 0012 .297z"></path></svg>` },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/a-benedick', icon: `<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path></svg>` },
    { name: 'Instagram', url: 'https://www.instagram.com/abrah4m.b', icon: `<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" stroke-width="0"><path d="M12 2c-2.717 0-3.056.01-4.122.06-1.065.05-1.79.217-2.428.465-.66.254-1.217.598-1.77.95-.554.35-1.025.82-1.375 1.375-.35.55-.705 1.217-.95 1.77-.25.637-.415 1.363-.465 2.428C2.01 8.944 2 9.283 2 12s.01 3.056.06 4.122c.05 1.065.217 1.79.465 2.428.254.66.598 1.217.95 1.77.35.554.82 1.025 1.375 1.375.55.35 1.217.705 1.77.95.637.25 1.363.415 2.428.465C8.944 21.99 9.283 22 12 22s3.056-.01 4.122-.06c1.065-.05 1.79-.217 2.428-.465.66-.254 1.217-.598 1.77-.95.554-.35 1.025-.82 1.375-1.375.35-.55.705-1.217.95-1.77.25-.637.415-1.363.465-2.428.05-1.066.06-1.405.06-4.122s-.01-3.056-.06-4.122c-.05-1.065-.217-1.79-.465-2.428a4.887 4.887 0 00-.95-1.77 4.887 4.887 0 00-1.375-1.375c-.55-.35-1.217-.705-1.77-.95-.637-.25-1.363-.415-2.428-.465C15.056 2.01 14.717 2 12 2zm0 1.8c2.67 0 2.987.01 4.042.058.975.048 1.505.207 1.857.344.457.182.765.399 1.126.76.36.36.577.67.76 1.126.137.352.296.882.344 1.857.048 1.055.058 1.372.058 4.042s-.01 2.987-.058 4.042c-.048.975-.207 1.505-.344 1.857a3.097 3.097 0 01-.76 1.126 3.097 3.097 0 01-1.126.76c-.352.137-.882.296-1.857.344-1.055.048-1.372.058-4.042.058s-2.987-.01-4.042-.058c-.975-.048-1.505-.207-1.857-.344a3.097 3.097 0 01-1.126-.76 3.097 3.097 0 01-.76-1.126c-.137-.352-.296-.882-.344-1.857-.048-1.055-.058-1.372-.058-4.042s.01-2.987.058-4.042c.048-.975.207-1.505.344-1.857.182-.457.399-.765.76-1.126a3.097 3.097 0 011.126-.76c.352-.137.882-.296 1.857-.344C9.013 3.81 9.33 3.8 12 3.8zm0 3.6c-2.404 0-4.36 1.956-4.36 4.36s1.956 4.36 4.36 4.36 4.36-1.956 4.36-4.36-1.956-4.36-4.36-4.36zm0 7.2c-1.547 0-2.8-1.253-2.8-2.8s1.253-2.8 2.8-2.8 2.8 1.253 2.8 2.8-1.253 2.8-2.8 2.8zm5.43-8.2c-.63 0-1.14.51-1.14 1.14s.51 1.14 1.14 1.14 1.14-.51 1.14-1.14-.51-1.14-1.14-1.14z"></path></svg>` },
    { name: 'WhatsApp', url: 'https://wa.me/6281264271985', icon: `<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.451-4.437-9.884-9.888-9.884-5.451 0-9.885 4.434-9.889 9.884-.001 2.225.651 4.315 1.831 6.063l-1.214 4.425 4.522-1.182z"></path></svg>` }
  ] as SocialLink[],
};

const personalProjects: Project[] = [
  { title: 'DDoS Tool Website Stresser', description: 'A professional tools DDoS solution to quickly and effectively take down target websites, especially online gambling, phishing, scam websites, and other sites upon request.', tech: ['Traffic Analysis', 'Mitigation', 'Cloudflare', 'Monitoring'], images: ['https://abraham.wiki/foto/ddos-cover'], category: 'Security' },
  { title: 'Takeover Domain & Create Subdomain', description: 'This project is an automation script built to discover and carry out large-scale subdomain takeovers by systematically testing lists of subdomains...', tech: ['Automation', 'DNS', 'Scripting', 'Take-Over Domain'], images: ['https://abraham.wiki/video/over2', 'https://abraham.wiki/video/over1'], category: 'Security' },
  { title: 'DDos Panel Website', url: 'https://panel.nexarium.net/', description: 'This website provides a service to conduct DDoS attacks by sending high volumes of data traffic to a website or server. This tool aims to test a domain\'s vulnerability to cyberattacks...', tech: ['React', 'Next.js', 'Cloudflare', 'Tailwind CSS', 'HTTP/3'], images: ['https://abraham.wiki/foto/nexa2', 'https://abraham.wiki/foto/nexa3', 'https://abraham.wiki/foto/nexa4'], category: 'Security' },
  { title: 'Video Editing Valorant : Bisa Tapi Mati', description: 'Project Editing Video', tech: ['Video Editing', 'Color Grading', 'Gaming'], category: 'Creative' },
  { title: 'From Offline to Online School', description: 'Project Editing Video', tech: ['Short Film', 'Storytelling', 'Award Winner'], category: 'Creative' },
  { title: 'Temukan Mimpi', description: 'Project Editing Video', tech: ['Short Film', 'Cinematography', 'Creative Direction'], category: 'Creative' },
];

export const projectsData: Project[] = [...personalProjects, ...(githubProjects as Project[])];

export const experienceData: Experience[] = [
  { title: 'Class President', meta: 'SMA Methodist-2 Medan | 2020 - 2023', description: 'Led class administration for 3 consecutive years during the challenging COVID-19 pandemic era. Managed virtual learning coordination, organized online events, and maintained class discipline.' },
  { title: 'Third Place - School Film Competition', meta: 'Short Film Competition - 2021', description: 'Awarded third place in the inter-school short film competition in Medan.', image: 'https://abraham.wiki/foto/juara3' },
  { title: 'Research Member - Cyber Physical System Laboratory', meta: 'Telkom University, Bandung | 2025 - Present', description: 'Successfully participated in the Dmouv project (motion detection), conducted penetration testing on cpslaboratory.com website, and worked on various web development and backend projects.', images: ['https://cpslaboratory.com/_next/image?url=%2Fimages%2FJourney%2FCR.JPG&w=1920&q=75', 'https://abraham.wiki/foto/CPS-Bram', 'https://abraham.wiki/foto/cpslaboratoryfoto'] },
  { title: 'Summer Internship Programme 2025', meta: 'Sri Eshwar College of Engineering, Coimbatore, India | Summer 2025', description: 'Participated in a summer internship program focused on embedded systems and communication protocols.', image: 'https://abraham.wiki/foto/internship.jpg' }
];

export const educationData: Education[] = [
  { title: 'S1 - Telecommunication Engineering', meta: 'Telkom University, Bandung | 2023 - Present', description: 'Undergraduate program focused on communication systems, signal processing, and networking.', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Logo_Telkom_University_potrait.png/500px-Logo_Telkom_University_potrait.png'},
  { title: 'SMA Methodist-2 Medan', meta: 'SMA Swasta Methodist-2 Medan | 2020 - 2023', description: '', logo: 'https://home.meth2medan.sch.id/wp-content/uploads/2025/02/cropped-Logo-M2-putih.png'},
  { title: 'SMP Methodist-2 Medan', meta: 'Sekolah Menengah Pertama | 2017 - 2020', description: '', logo: 'https://home.meth2medan.sch.id/wp-content/uploads/2025/02/cropped-Logo-M2-putih.png' }
];

export const techSkillsData: TechSkill[] = [
  { name: 'Pentesting', icon: 'https://cdn-icons-png.flaticon.com/512/6653/6653214.png', desc: 'Authorized penetration testing: scoped recon, safe PoCs, clear reports. Focused on strengthening real systems, not breaking them.' },
  { name: 'Web Security', icon: 'https://cdn-icons-png.flaticon.com/128/3043/3043867.png', desc: 'Application security reviews: architecture and code, input validation, auth/session hardening, and mitigation for common vulns (XSS, SQLi, CSRF).' },
  { name: 'Webshell & Backdoor (research)', icon: 'https://cdn-icons-png.flaticon.com/128/3539/3539955.png', desc: 'Forensic analysis and detection in isolated labs. Producing IOCs, containment/cleanup procedures, and practical playbooks for incident response teams.' },
  { name: 'DDoS Tooling (research & mitigation)', icon: 'https://cdn-icons-png.flaticon.com/128/6072/6072147.png', desc: 'Traffic simulation platforms for authorized resilience testing, attack pattern analysis, and mitigation strategies (rate limiting, CDN/WAF tuning, observability).' },
  { name: 'PHP', icon: 'https://cdn-icons-png.flaticon.com/128/2721/2721652.png', desc: 'Secure PHP engineering: prepared statements, and refactors that shut down attack surfaces without sacrificing performance.' },
  { name: 'Python', icon: 'https://cdn-icons-png.flaticon.com/128/2570/2570575.png', desc: 'Automation and tooling: scanners, result parsing.' },
  { name: 'JavaScript & Node', icon: 'https://cdn-icons-png.flaticon.com/128/5968/5968322.png', desc: 'Backend API and services with Node.js.' },
  { name: 'SEO Analysis & Tools', icon: 'https://cdn-icons-png.flaticon.com/128/3607/3607459.png', desc: 'Technical SEO: crawlability, content structure, and backlink audits plus ethical tooling to monitor and improve rankings.' },
  { name: 'Cloudflare & Networking', icon: 'https://icon.icepanel.io/Technology/svg/Cloudflare.svg', desc: 'CDN/DNS/WAF operations: caching strategies, rate limiting, and edge rules to boost resilience and reduce Layer-7 noise.' }
];

export const navIcons: { [key: string]: string } = {
  Home: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
  Education: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
  Skills: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
  Projects: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`,
  Experience: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
  Contact: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`
};

export const sections: SectionData[] = [
    { id: 'home', label: 'Home' },
    { id: 'education', label: 'Education' },
    { id: 'skills', label: 'Skills' },
    { id: 'projects', label: 'Projects' },
    { id: 'experience', label: 'Experience' },
    { id: 'contact', label: 'Contact' },
];
