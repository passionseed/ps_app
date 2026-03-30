import type { SeedWithEnrollment } from "../../types/seeds";

/** Apple HIG–style header collapse */
export const ANIMATION_CONFIG = {
  largeTitleHeight: 96,
  smallTitleHeight: 44,
  searchBarHeight: 48,
  collapseThreshold: 50,
  headerCollapsedAt: 80,
} as const;

export const SAMPLE_SEEDS: Partial<SeedWithEnrollment>[] = [
  {
    id: "sample-1",
    title: "Software Engineer",
    slogan: "Build the future with code",
    cover_image_url: require("../../assets/images/se_tangible.png"),
  },
  {
    id: "sample-2",
    title: "UX Designer",
    slogan: "Craft beautiful experiences",
    cover_image_url: require("../../assets/images/ux_tangible.png"),
  },
  {
    id: "sample-3",
    title: "Data Scientist",
    slogan: "Unlock insights from data",
    cover_image_url: require("../../assets/images/ds_tangible.png"),
  },
  {
    id: "sample-4",
    title: "Dentist",
    slogan: "Design confident smiles",
    cover_image_url: require("../../assets/images/dentist_tangible.png"),
  },
  {
    id: "sample-5",
    title: "Lawyer",
    slogan: "Advocate for justice and rights",
    cover_image_url: require("../../assets/images/lawyer_tangible.png"),
  },
  {
    id: "sample-6",
    title: "Chef",
    slogan: "Create culinary masterpieces",
    cover_image_url: require("../../assets/images/chef_tangible.png"),
  },
  {
    id: "sample-7",
    title: "Architect",
    slogan: "Design the spaces we live in",
    cover_image_url: require("../../assets/images/architect_tangible.png"),
  },
  {
    id: "sample-8",
    title: "Teacher",
    slogan: "Inspire the next generation",
    cover_image_url: require("../../assets/images/teacher_tangible.png"),
  },
  {
    id: "sample-9",
    title: "Nurse",
    slogan: "Care for those in need",
    cover_image_url: require("../../assets/images/nurse_tangible.png"),
  },
  {
    id: "sample-10",
    title: "Product Manager",
    slogan: "Lead product innovation",
    cover_image_url: null,
  },
  {
    id: "sample-11",
    title: "Marketing Specialist",
    slogan: "Tell compelling stories",
    cover_image_url: null,
  },
  {
    id: "sample-12",
    title: "Entrepreneur",
    slogan: "Build your own business",
    cover_image_url: null,
  },
  {
    id: "sample-13",
    title: "Cybersecurity Analyst",
    slogan: "Protect the digital realm",
    cover_image_url: null,
  },
  {
    id: "sample-14",
    title: "Game Developer",
    slogan: "Create new worlds",
    cover_image_url: null,
  },
  {
    id: "sample-15",
    title: "3D Animator",
    slogan: "Bring characters to life",
    cover_image_url: null,
  },
  {
    id: "sample-16",
    title: "Mechanical Engineer",
    slogan: "Design the physical world",
    cover_image_url: null,
  },
];
