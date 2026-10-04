/** Editorial structure for the public 75-day learning pathway; course records remain admin-managed. */
export const PROGRAM = [
  {
    slug: "digital-foundation-computer-confidence", number: "01", segment: 1,
    title: "Digital Foundation & Computer Confidence", level: "Absolute Beginner",
    purpose: "Build basic computer confidence and digital independence.",
    topics: ["Computer and device basics", "Keyboard and mouse practice", "Typing and basic writing", "Files and folders", "Internet and browser basics", "Email and online communication", "Basic online safety", "Digital etiquette", "Basic productivity tools", "Practical computer exercises", "Digital confidence building"],
    project: "Guided computer exercises and everyday digital tasks.",
    outcome: "By the end of this course, beginners should be able to confidently perform basic computer and internet tasks required for further learning.",
  },
  {
    slug: "digital-literacy-communication-ai-readiness", number: "02", segment: 1,
    title: "Digital Literacy, Communication & AI Readiness", level: "Beginner",
    purpose: "Develop the digital, communication and learning habits required before entering AI-powered technical training.",
    topics: ["Effective online communication", "Searching and finding reliable information", "Basic productivity and collaboration tools", "Digital teamwork", "Communication skills", "Problem-solving", "Creativity and critical thinking", "Introduction to Artificial Intelligence", "Basic prompt writing", "Understanding AI limitations", "Verifying AI-generated information", "Personal data protection", "Responsible AI use", "Presentation skills", "Independent learning habits"],
    project: "Practise researching, collaborating, presenting and checking AI-assisted work.",
    outcome: "Learners become digitally confident, communicative and ready to use AI tools responsibly for practical learning and work.",
  },
  {
    slug: "ai-creative-video-content-digital-marketing", number: "03", segment: 2,
    title: "AI Creative Skills: Video, Content & Digital Marketing", level: "Beginner to Intermediate",
    purpose: "Teach learners how to use AI-assisted tools to create professional digital content and complete videos.",
    topics: ["AI-assisted idea generation", "Content planning", "Script writing", "Storyboarding", "AI-assisted visual creation", "Image generation", "Voiceover generation", "Video editing", "Subtitles and captions", "Audio and background music", "Complete 5–10 minute video production", "Social media content", "Digital marketing fundamentals", "Audience awareness", "Basic campaign concepts", "Measuring content performance", "Practical AI automation"],
    project: "Create and publish a complete 5–10 minute AI-assisted video. Planning → Script → Visuals → Voice → Editing → Subtitles → Final Export.",
    outcome: "A complete, publishable AI-assisted video and practical content-marketing experience.",
  },
  {
    slug: "ai-app-website-digital-project-development", number: "04", segment: 2,
    title: "AI App, Website & Digital Project Development", level: "Beginner to Intermediate",
    purpose: "Introduce learners to practical AI-assisted development and help them build a useful digital solution for a real-world need.",
    topics: ["Understanding apps and digital tools", "Identifying real user problems", "Basic UI/UX concepts", "AI-assisted coding", "No-code/low-code development", "Building a functional app or digital tool", "Website development", "Mobile-friendly website design", "Testing core features", "Troubleshooting", "Debugging", "Publishing/deployment", "Documentation", "Project presentation", "Portfolio development"],
    project: "Build and demonstrate one useful app/digital tool and/or one practical website or digital marketing project. Test and demonstrate the final project.",
    outcome: "A tested, demonstrated digital project with documentation for a practical portfolio.",
  },
] as const;

export const PROGRAM_SLUGS: string[] = PROGRAM.map((course) => course.slug);