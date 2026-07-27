(function exposeProjectVideoData(root, factory) {
  var data = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = data;
  } else {
    root.PROJECT_VIDEO_DATA = data;
  }
}(typeof self !== "undefined" ? self : this, function buildProjectVideoData() {
  return [
    {
      slug: "aligniq",
      title: "AlignIQ",
      filmTitle: "Making delivery drift visible",
      category: "AI delivery intelligence",
      year: "2026",
      accent: "#00b4d8",
      accent2: "#10b981",
      image: "../images/vercel/aligniq-dashboard.jpg",
      imageAlt: "AlignIQ alignment dashboard",
      headline: "Requirements traceability that turns gaps into evidence.",
      highlights: [
        "BRD → PRD → Features",
        "Acceptance criteria → Tests",
        "Evidence-backed recommendations"
      ],
      flow: [
        { label: "01", title: "Ingest", body: "BRDs, PRDs and Azure DevOps delivery artifacts" },
        { label: "02", title: "Align", body: "Compare intent, features, acceptance criteria and coverage" },
        { label: "03", title: "Act", body: "Surface drift with evidence and recommended next steps" }
      ],
      stack: ["Next.js 14", "TypeScript", "Tailwind CSS", "Radix UI"],
      liveUrl: "https://aligniq.rdprassy.com",
      sourceUrl: "https://github.com/rdprassy/aligniq",
      portfolioUrl: "https://www.rdprassy.com/live-projects.html#aligniq",
      youtubeTitle: "AlignIQ: AI-Assisted Software Delivery Alignment | rdprassy Project Film",
      youtubeDescription: "AlignIQ is a requirements-alignment workspace that helps teams expose drift across BRDs, PRDs, delivery features, acceptance criteria, and test coverage.\n\nLive demo: https://aligniq.rdprassy.com\nSource: https://github.com/rdprassy/aligniq\nCase study: https://www.rdprassy.com/live-projects.html#aligniq\n\nBuilt with Next.js 14, TypeScript, Tailwind CSS, and Radix UI.",
      voiceover: "Software delivery rarely fails because a requirement never existed. It fails when intent drifts between business documents, product requirements, delivery features, acceptance criteria, and tests. AlignIQ makes that drift visible. The dashboard compares artifacts across seven alignment dimensions, highlights critical gaps, and attaches evidence and recommended actions to every finding. The product includes upload, reporting, Azure DevOps configuration, and threshold workflows, built as a typed Next.js application. Its public deployment uses demonstration data when the backend is unavailable, so the full product idea remains inspectable. AlignIQ turns a vague alignment problem into a workflow teams can see, discuss, and improve."
    },
    {
      slug: "nft-terminal",
      title: "NFT Terminal",
      filmTitle: "Creator infrastructure on Monad",
      category: "Web3 product",
      year: "2026",
      accent: "#7c5cff",
      accent2: "#b993ff",
      image: "../images/vercel/monadblitz-nft-terminal.jpg",
      imageAlt: "NFT Terminal creator launchpad",
      headline: "Deploy, mint, gate and understand an NFT collection.",
      highlights: [
        "No-code ERC-721 deployment",
        "Merkle allowlists + analytics",
        "Public Monad Testnet contract"
      ],
      flow: [
        { label: "01", title: "Configure", body: "Collection metadata, supply, price and wallet limits" },
        { label: "02", title: "Deploy", body: "Launch an ERC-721 contract on Monad Testnet" },
        { label: "03", title: "Grow", body: "Manage allowlists, analytics and token-gated access" }
      ],
      stack: ["Next.js 14", "wagmi v2", "viem", "Solidity", "Hardhat"],
      liveUrl: "https://monadblitz.rdprassy.com",
      sourceUrl: "https://github.com/rdprassy/monadblitzapp",
      portfolioUrl: "https://www.rdprassy.com/live-projects.html#nft-terminal",
      youtubeTitle: "NFT Terminal: A No-Code NFT Launchpad on Monad | rdprassy Project Film",
      youtubeDescription: "NFT Terminal is an all-in-one creator launchpad for deploying ERC-721 collections, managing allowlists, inspecting holder analytics, and generating token-gating integrations on Monad.\n\nLive demo: https://monadblitz.rdprassy.com\nSource: https://github.com/rdprassy/monadblitzapp\nCase study: https://www.rdprassy.com/live-projects.html#nft-terminal\n\nBuilt with Next.js, wagmi, viem, Solidity, Hardhat, and OpenZeppelin.",
      voiceover: "NFT Terminal asks a simple product question: how much blockchain complexity can disappear without hiding what matters? Creators configure collection metadata, supply, mint price, and wallet limits, then deploy an ERC-721 contract to Monad Testnet. The workflow continues with Merkle-tree allowlists, holder analytics, and ready-to-use token-gating snippets for React, HTML, Node, and Next.js. Under the interface, wagmi and viem handle wallet interaction while Solidity, Hardhat, and OpenZeppelin provide the contract foundation. A public testnet contract makes the deployment verifiable. The result is creator infrastructure that connects a polished product experience to inspectable on-chain execution."
    },
    {
      slug: "monad-wallet-checker",
      title: "Monad Wallet Checker",
      filmTitle: "A focused Web3 utility",
      category: "Web3 utility",
      year: "2026",
      accent: "#7c3aed",
      accent2: "#6366f1",
      image: "../images/vercel/monad-wallet-checker.jpg",
      imageAlt: "Monad Wallet Checker interface",
      headline: "Wallet connection and address lookup without mystery.",
      highlights: [
        "One-click MetaMask connection",
        "Live MON balance lookup",
        "Visible multi-RPC fallback"
      ],
      flow: [
        { label: "01", title: "Connect", body: "Use MetaMask or enter any compatible address" },
        { label: "02", title: "Resolve", body: "Query Monad through public or custom RPC endpoints" },
        { label: "03", title: "Verify", body: "Refresh balances and continue to the block explorer" }
      ],
      stack: ["React 18", "TypeScript", "ethers.js 6", "Vite", "Tailwind CSS"],
      liveUrl: "https://vercel.rdprassy.com",
      sourceUrl: "https://github.com/rdprassy/Web3-Wallet-Checker",
      portfolioUrl: "https://www.rdprassy.com/live-projects.html#wallet-checker",
      youtubeTitle: "Monad Wallet Checker with MetaMask and RPC Fallback | rdprassy Project Film",
      youtubeDescription: "Monad Wallet Checker connects MetaMask or checks any compatible address, retrieves MON balances, and keeps custom RPC configuration visible.\n\nLive demo: https://vercel.rdprassy.com\nSource: https://github.com/rdprassy/Web3-Wallet-Checker\nCase study: https://www.rdprassy.com/live-projects.html#wallet-checker\n\nBuilt with React, TypeScript, ethers.js, Vite, and Tailwind CSS.",
      voiceover: "Small utilities can reveal strong product judgment. Monad Wallet Checker connects MetaMask with one click, switches to the configured Monad network, and retrieves live wallet details. It also checks any compatible address without requiring a wallet connection. Public RPC endpoints can rate-limit or fail, so the interface makes custom provider configuration visible instead of turning infrastructure problems into unexplained errors. Users can refresh results, copy an address, and continue to the block explorer. Built with React, TypeScript, ethers.js, Vite, and Tailwind, the project is intentionally focused: make a common Web3 task understandable, resilient, and quick."
    },
    {
      slug: "applied-ai-engineering",
      title: "Applied AI Engineering",
      filmTitle: "Models connected to operations",
      category: "Enterprise AI",
      year: "2024–2026",
      accent: "#0c7c64",
      accent2: "#52d0ad",
      image: null,
      headline: "Analytics, retrieval and agent reliability with measurable boundaries.",
      highlights: [
        "≈50 stakeholders across 5+ accounts",
        "≈1,500 indexed documents",
        "20+ monitored data pipelines"
      ],
      flow: [
        { label: "R360", title: "Decide", body: "AI-assisted retail analytics for sales and operations" },
        { label: "RAG", title: "Ground", body: "Document retrieval with citations and evaluation" },
        { label: "AG", title: "Recover", body: "Agent-assisted monitoring, triage and alerts" }
      ],
      stack: ["LLMs", "RAG", "Semantic search", "Agents", "Evaluation"],
      liveUrl: "https://www.rdprassy.com/ai-lab.html",
      sourceUrl: "https://www.rdprassy.com/engineering-artifacts.html",
      portfolioUrl: "https://www.rdprassy.com/ai-engineering.html",
      youtubeTitle: "Applied AI Engineering: Analytics, RAG and Agent Reliability | rdprassy",
      youtubeDescription: "A public-safe look at applied AI work spanning Retail360 decision support, document intelligence, and agent-assisted data-pipeline reliability.\n\nCase study: https://www.rdprassy.com/ai-engineering.html\nInteractive lab: https://www.rdprassy.com/ai-lab.html\nArtifacts: https://www.rdprassy.com/engineering-artifacts.html",
      voiceover: "Applied AI becomes useful when models connect to decisions, evidence, and operations. This body of work spans three systems. Retail360 supports roughly fifty sales and operations stakeholders across more than five retail accounts. A document-intelligence workflow indexes approximately fifteen hundred documents and serves more than three hundred reported monthly questions through retrieval and semantic search. An agentic reliability system monitors over twenty data pipelines and helps triage around fifty reported monthly failures. The engineering focus is broader than prompting: data boundaries, retrieval quality, citations, evaluation, alerts, latency, cost, and human review. The portfolio includes a transparent retrieval lab and sanitized artifacts so the decisions remain inspectable."
    },
    {
      slug: "amazon-impact",
      title: "Amazon Impact",
      filmTitle: "Weekly operations made actionable",
      category: "Operations intelligence",
      year: "2020–2021",
      accent: "#ef9e56",
      accent2: "#ffc878",
      image: null,
      headline: "From fragmented weekly data to a repeatable leadership view.",
      highlights: [
        "Leadership-facing operational insight",
        "Serverless AWS workflows",
        "Incident fixes carried to root cause"
      ],
      flow: [
        { label: "01", title: "Collect", body: "Bring weekly operational signals into one workflow" },
        { label: "02", title: "Shape", body: "Use Lambda and DynamoDB to prepare reliable views" },
        { label: "03", title: "Act", body: "Give leaders a repeatable React decision surface" }
      ],
      stack: ["AWS Lambda", "DynamoDB", "React", "Incident ownership"],
      liveUrl: null,
      sourceUrl: null,
      portfolioUrl: "https://www.rdprassy.com/projects.html#amazon-impact",
      youtubeTitle: "Amazon Impact: Operations Intelligence with AWS and React | rdprassy",
      youtubeDescription: "A public-safe case study of Amazon Impact, an internal application for repeatable weekly operations insight using AWS Lambda, DynamoDB, and React.\n\nCase study: https://www.rdprassy.com/projects.html#amazon-impact",
      voiceover: "Weekly operations reviews need more than another dashboard. They need a consistent view that leaders can access quickly and trust. Amazon Impact brought operational signals into a repeatable application workflow built with AWS Lambda, DynamoDB, and React. The work connected serverless processing, durable data, and a usable leadership interface. Ownership also extended into production: high-severity incidents were handled through recovery, root-cause analysis, and durable fixes rather than short-lived patches. Because this was internal work, the public case study protects private metrics and implementation detail. What remains visible is the engineering pattern: turn fragmented operational data into a dependable decision surface, then keep improving it under real-world pressure."
    },
    {
      slug: "oracle-cloud-pcn",
      title: "Oracle Cloud PCN",
      filmTitle: "Maintenance with an audit trail",
      category: "Cloud operations",
      year: "2020",
      accent: "#e34a3b",
      accent2: "#ff8c78",
      image: null,
      headline: "Schedule product changes without losing their history.",
      highlights: [
        "Controlled maintenance scheduling",
        "Persistent change history",
        "Full-stack stakeholder workflows"
      ],
      flow: [
        { label: "01", title: "Plan", body: "Coordinate product maintenance with stakeholders" },
        { label: "02", title: "Persist", body: "Model every change instead of only the latest state" },
        { label: "03", title: "Review", body: "Expose an auditable history through the product UI" }
      ],
      stack: ["Spring Boot", "React", "TypeScript", "Audit modeling"],
      liveUrl: null,
      sourceUrl: null,
      portfolioUrl: "https://www.rdprassy.com/projects.html#oracle-pcn",
      youtubeTitle: "Oracle Cloud PCN: Maintenance Scheduling with Audit History | rdprassy",
      youtubeDescription: "A public-safe case study of Oracle Cloud Product Change Notifications: scheduling maintenance changes while preserving an auditable product history.\n\nCase study: https://www.rdprassy.com/projects.html#oracle-pcn",
      voiceover: "Cloud maintenance is not only a scheduling problem. Every change needs stakeholder visibility and a history people can trust. Oracle Cloud Product Change Notifications connected those needs in one full-stack product. Spring Boot services and a React interface written in TypeScript supported the scheduling workflow. The data model preserved changes over time rather than keeping only the latest state, which created an auditable trail for future review. That design decision is the center of the project: operational software should explain how it reached its current state. The result linked maintenance coordination, durable history, and a clear stakeholder experience without exposing confidential product details."
    },
    {
      slug: "teradata-vantage",
      title: "Teradata Vantage",
      filmTitle: "Developer experience meets provisioning",
      category: "Enterprise analytics",
      year: "2018–2020",
      accent: "#f37440",
      accent2: "#ffb067",
      image: null,
      headline: "Help developers create analytics, then make installation repeatable.",
      highlights: [
        "Eclipse RCP development tooling",
        "Analytical-function execution",
        "Django provisioning microservice"
      ],
      flow: [
        { label: "01", title: "Create", body: "Build analytical functions in a desktop development environment" },
        { label: "02", title: "Execute", body: "Run and validate functions through the product workflow" },
        { label: "03", title: "Provision", body: "Install them automatically as Vantage clusters launch" }
      ],
      stack: ["Java", "Eclipse RCP", "Python", "Django", "Cloud provisioning"],
      liveUrl: null,
      sourceUrl: null,
      portfolioUrl: "https://www.rdprassy.com/projects.html#teradata-vantage",
      youtubeTitle: "Teradata Vantage: Analytics Tooling and Cloud Provisioning | rdprassy",
      youtubeDescription: "A public-safe project film about developer tooling and automated analytical-function installation for Teradata Vantage.\n\nCase study: https://www.rdprassy.com/projects.html#teradata-vantage",
      voiceover: "Developer experience and platform automation are two sides of the same product. For Teradata Vantage, one side was an Eclipse Rich Client Platform environment where customers could create and execute analytical functions. The other was a Python Django microservice, developed from scratch, that installed those functions as Vantage clusters were provisioned in the cloud. Java plugins and fragments shaped the desktop workflow; the microservice made installation repeatable at platform scale. Together, the work connected what developers could build with how customers could receive it. The lasting lesson is simple: a capability becomes far more valuable when the path from creation to deployment is designed as one system."
    },
    {
      slug: "axa-premium-engine",
      title: "AXA Premium Engine",
      filmTitle: "Calculation software for a regulated domain",
      category: "Insurance systems",
      year: "2016–2018",
      accent: "#2b4c9b",
      accent2: "#6d8ed8",
      image: null,
      headline: "Dynamic premium calculation backed by a repeatable build.",
      highlights: [
        "On-demand premium generation",
        "Policy and customer inputs",
        "Automated build workflow"
      ],
      flow: [
        { label: "01", title: "Capture", body: "Receive the policy and customer inputs that drive a quote" },
        { label: "02", title: "Calculate", body: "Apply maintainable business rules in Spring Boot" },
        { label: "03", title: "Deliver", body: "Use an automated build for repeatable releases" }
      ],
      stack: ["Java", "Spring Boot", "Business rules", "Build automation"],
      liveUrl: null,
      sourceUrl: null,
      portfolioUrl: "https://www.rdprassy.com/projects.html#axa",
      youtubeTitle: "AXA Insurance Premium Engine with Spring Boot | rdprassy Project Film",
      youtubeDescription: "A public-safe case study of a Spring Boot calculation engine for generating insurance premiums on demand, supported by an automated build workflow.\n\nCase study: https://www.rdprassy.com/projects.html#axa",
      voiceover: "Insurance software turns complex policy rules into decisions customers need to trust. This AXA Germany application generated premiums dynamically from policy and customer inputs using Java and Spring Boot. The engineering challenge was not only implementing calculations. In a regulated domain, business rules must stay understandable, maintainable, and traceable as the product evolves. The application build was also automated, improving repeatability and reducing manual release friction. Private business logic and metrics stay confidential, but the public engineering story is clear: dependable calculation software needs disciplined rule implementation and disciplined delivery. Maintainability and traceability are product features, not work that can wait until later."
    },
    {
      slug: "pega-platform",
      title: "Pegasystems Platform",
      filmTitle: "A microservice inside a shared platform",
      category: "Platform engineering",
      year: "2021",
      accent: "#166b8f",
      accent2: "#4db6d8",
      image: null,
      headline: "Build a service that respects the ecosystem around it.",
      highlights: [
        "Enterprise microservice contribution",
        "Platform conventions and contracts",
        "Pega + Oracle Cloud context"
      ],
      flow: [
        { label: "01", title: "Understand", body: "Learn the architecture and conventions of a shared platform" },
        { label: "02", title: "Contribute", body: "Add a microservice within the broader Pega ecosystem" },
        { label: "03", title: "Support", body: "Design for the teams and products building on the service" }
      ],
      stack: ["Microservices", "Pega", "Oracle Cloud", "Platform contracts"],
      liveUrl: null,
      sourceUrl: null,
      portfolioUrl: "https://www.rdprassy.com/projects.html#pega",
      youtubeTitle: "Pegasystems Platform Microservice: Engineering for Shared Systems | rdprassy",
      youtubeDescription: "A public-safe project film about contributing a microservice within the Pegasystems enterprise application platform.\n\nCase study: https://www.rdprassy.com/projects.html#pega",
      voiceover: "A platform service is successful only when other teams can depend on it. This project contributed a microservice within the broader Pegasystems enterprise application ecosystem. The work required more than implementing an isolated feature. It meant understanding platform conventions, clean service contracts, Pega system architecture, and the surrounding Oracle Cloud context. Shared platforms reward consistency because every decision affects downstream builders. The public case study intentionally avoids confidential implementation detail, but the engineering principle travels well: design a service with empathy for the teams using it, follow the contracts that keep a platform coherent, and treat dependable integration as part of the product itself."
    },
    {
      slug: "palmprint-recognition",
      title: "Palmprint Recognition",
      filmTitle: "An end-to-end biometric research system",
      category: "Biometric research",
      year: "2014–2015",
      accent: "#6d4c9f",
      accent2: "#ba8ce0",
      image: null,
      headline: "From an image of a palm to a genuine-or-impostor decision.",
      highlights: [
        "Particle Swarm Optimization",
        "Gabor feature extraction",
        "Euclidean-distance matching"
      ],
      flow: [
        { label: "01", title: "Segment", body: "Use Particle Swarm Optimization to isolate the palm region" },
        { label: "02", title: "Extract", body: "Apply Gabor filters to describe ridge information" },
        { label: "03", title: "Match", body: "Compare features with Euclidean distance and classify" }
      ],
      stack: ["MATLAB", "PSO", "Gabor filters", "Biometric matching"],
      liveUrl: null,
      sourceUrl: null,
      portfolioUrl: "https://www.rdprassy.com/projects.html#palmprint-system",
      youtubeTitle: "Palmprint Recognition with PSO and Gabor Filters | rdprassy Project Film",
      youtubeDescription: "A final-year biometric research project using Particle Swarm Optimization, Gabor filters, and Euclidean-distance matching to classify palmprints.\n\nCase study: https://www.rdprassy.com/projects.html#palmprint-system",
      voiceover: "This palmprint recognition system was an early exercise in building a complete research pipeline. First, Particle Swarm Optimization isolated the useful palm region from an input image. Next, Gabor filters transformed ridge patterns into feature information that could be compared. Finally, Euclidean distance measured the candidate against a registered sample and classified it as genuine or impostor. The project was built in MATLAB and combined image processing, optimization, feature extraction, and matching inside one working system. More than a final-year project, it established a pattern that still shapes later work: break a difficult problem into observable stages, validate each transformation, and connect the pieces into a usable result."
    }
  ];
}));
