import type {
  Workspace,
  UserProfile,
  DocumentRecord,
  AnalysisRecord,
  ResearchGapResult,
  ResearchEvolutionResult,
  ResearchQuestionResult,
  ResearchDecisionResult,
  TeachingPulseResult,
  QueryClusteringResult,
  ExamMisconceptionResult,
  StudentPortfolioData,
  LorDossierResult,
  CurriculumAlignmentResult,
} from "@pedago/shared";

export const DEMO_USER: UserProfile = {
  id: "usr_fac_01",
  email: "faculty@pedago.edu",
  name: "Dr. Elena Rostova",
  role: "faculty",
  institution: "Zurich Federal Polytechnic Institute",
  department: "Department of Computer Science & Intelligent Systems",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
};

export const DEMO_WORKSPACES: Workspace[] = [
  {
    id: "ws_fall2025",
    name: "CS Dept - Fall 2025 Core Courses",
    slug: "cs-fall-2025",
    role: "faculty",
    description: "Algorithms, Distributed Systems, and Capstone Advising",
    createdAt: "2025-08-15T08:00:00Z",
    updatedAt: "2025-09-01T14:30:00Z",
  },
  {
    id: "ws_distrib_lab",
    name: "Distributed & Edge Intelligence Lab",
    slug: "deil-research",
    role: "owner",
    description: "Doctoral research group, grant proposals, and literature mapping",
    createdAt: "2025-06-10T10:00:00Z",
    updatedAt: "2025-09-03T11:20:00Z",
  },
];

export const DEMO_DOCUMENTS: DocumentRecord[] = [
  {
    id: "doc_01",
    workspaceId: "ws_fall2025",
    title: "CSE 2201 Midterm Examination 2025.pdf",
    filename: "CSE_2201_Midterm_2025.pdf",
    fileSize: 1420500,
    mimeType: "application/pdf",
    status: "indexed",
    pageCount: 8,
    createdAt: "2025-09-02T10:15:00Z",
    updatedAt: "2025-09-02T10:16:30Z",
  },
  {
    id: "doc_02",
    workspaceId: "ws_fall2025",
    title: "Midterm Student Itemized Marks & Answer Samples.csv",
    filename: "Midterm_Itemized_Marks.csv",
    fileSize: 452000,
    mimeType: "text/csv",
    status: "indexed",
    createdAt: "2025-09-02T11:00:00Z",
    updatedAt: "2025-09-02T11:01:10Z",
  },
  {
    id: "doc_03",
    workspaceId: "ws_fall2025",
    title: "PulseAI Week 3 Exit Slips & Lab Notes.txt",
    filename: "PulseAI_Week3_ExitSlips.txt",
    fileSize: 98400,
    mimeType: "text/plain",
    status: "indexed",
    createdAt: "2025-09-04T16:00:00Z",
    updatedAt: "2025-09-04T16:00:45Z",
  },
  {
    id: "doc_04",
    workspaceId: "ws_distrib_lab",
    title: "Byzantine Agreement in LEO Satellite Constellations (2024).pdf",
    filename: "LEO_Byzantine_Agreement_2024.pdf",
    fileSize: 3200100,
    mimeType: "application/pdf",
    status: "indexed",
    pageCount: 14,
    createdAt: "2025-08-28T09:20:00Z",
    updatedAt: "2025-08-28T09:22:00Z",
  },
];

// 1. Research Gap Demo
export const DEMO_RESEARCH_GAP_RESULT: ResearchGapResult = {
  verdict: "partially_supported",
  verdictRationale:
    "No matching work was found implementing asynchronous consensus with bounded clock drift specifically under orbital Doppler shifts. However, closely related fault models exist in intermittent underwater acoustic swarms (Zhang et al., 2023) and multi-hop LEO routing (Al-Husseini, 2024).",
  searchCoverage: {
    queriesRun: [
      "Byzantine fault tolerance 'satellite swarm' orbital delay",
      "LEO constellation consensus intermittent connectivity bounded drift",
      "Asynchronous consensus doppler shift dynamic topology",
    ],
    sourcesSearched: ["IEEE Xplore", "ACM Digital Library", "arXiv CS.DC", "DBLP"],
    totalPapersIndexed: 412,
    matchCount: 19,
  },
  closestPriorWork: [
    {
      id: "pw_01",
      title: "Resilient Consensus for Orbital Mesh Networks under High Dynamics",
      authors: ["Al-Husseini, K.", "Mendoza, S.", "Vanderberg, R."],
      year: 2024,
      venue: "IEEE Transactions on Aerospace and Electronic Systems",
      similarityScore: 0.81,
      keyDifference:
        "Assumes synchronous synchronized GPS time slots, whereas your claimed gap targets uncoordinated clock drift without continuous GPS lock.",
      isContradicting: false,
      citationUrl: "https://doi.org/10.1109/TAES.2024.09112",
    },
    {
      id: "pw_02",
      title: "Byzantine Fault Tolerant Swarm Routing in Intermittent Acoustic Media",
      authors: ["Zhang, L.", "Chen, W.", "O'Connor, P."],
      year: 2023,
      venue: "ACM Sigcomm CCR",
      similarityScore: 0.74,
      keyDifference:
        "Operates at acoustic speeds (~1500m/s) with very high packet loss, but does not address relativistic propagation or fast-changing orbital topology.",
      isContradicting: false,
      citationUrl: "https://doi.org/10.1145/sigcomm.2023.109",
    },
    {
      id: "pw_03",
      title: "Limits of Practical BFT in Highly Partitioned Mega-Constellations",
      authors: ["Patel, D.", "Schmidt, H."],
      year: 2022,
      venue: "USENIX NSDI",
      similarityScore: 0.69,
      keyDifference:
        "Proves that deterministic 3f+1 quorum cannot terminate within 2 orbital passes without predictive partition trees; your proposal must address this proof.",
      isContradicting: true,
      citationUrl: "https://usenix.org/conference/nsdi22/patel",
    },
  ],
  suggestedReformulations: [
    "Refine the gap from 'general BFT for satellites' to 'Predictive topology-aware asynchronous BFT resilient to periodic relativistic clock skew in non-GPS orbital shells.'",
    "Explicitly bound the maximum network partition window against Patel & Schmidt's 2022 impossibility threshold.",
  ],
  findings: [
    {
      id: "f_gap_01",
      title: "Novelty Verified for Asynchronous Skew-Tolerant Consensus in LEO",
      summary:
        "Across 412 indexed peer-reviewed papers (2018-2025), no existing architecture combines zero-GPS clock-skew compensation with BFT quorum formation under inter-satellite orbital doppler.",
      confidence: "high",
      evidence: [
        {
          id: "ev_01",
          documentId: "doc_04",
          title: "LEO_Byzantine_Agreement_2024.pdf",
          locator: "Section 3.2, p. 5",
          excerpt:
            "Current protocols mandate continuous GNSS synchronization; when satellite occultation occurs for >120s, quorum membership becomes indeterminate.",
          publishedYear: 2024,
        },
      ],
      limitations: [
        "Analysis based on English-language publications indexed in DBLP and IEEE Xplore.",
        "Preprints from the last 60 days on e-Print archives may contain pending submissions.",
      ],
      requiresHumanReview: true,
    },
  ],
  limitations: [
    "Evidence scoped to LEO satellite dynamics; does not evaluate Geostationary or Deep-Space delay-tolerant networks.",
    "Hardware-level radiation induced SEUs were excluded from the fault model.",
  ],
};

// 2. Research Evolution Demo
export const DEMO_RESEARCH_EVOLUTION_RESULT: ResearchEvolutionResult = {
  timeline: [
    { year: 2020, paperCount: 38, methods: { "Quadratic Attention": 32, "Sparse Attention": 6, "State Space": 0 } },
    { year: 2021, paperCount: 65, methods: { "Quadratic Attention": 45, "Sparse Attention": 18, "State Space": 2 } },
    { year: 2022, paperCount: 112, methods: { "Quadratic Attention": 50, "Sparse Attention": 48, "State Space": 14 } },
    { year: 2023, paperCount: 198, methods: { "Quadratic Attention": 40, "Sparse Attention": 95, "State Space": 63 } },
    { year: 2024, paperCount: 310, methods: { "Quadratic Attention": 25, "Sparse Attention": 145, "State Space": 140 } },
    { year: 2025, paperCount: 420, methods: { "Quadratic Attention": 15, "Sparse Attention": 180, "State Space": 225 } },
  ],
  topics: [
    {
      topic: "Hybrid SSM-Transformer Attention (Mamba/Jamba)",
      status: "emerging",
      growthRate: 184,
      evidence: [
        {
          id: "ev_evo_01",
          title: "Linear-Time Sequence Modeling via Selective State Spaces",
          locator: "ICLR 2024",
          excerpt: "Selective SSMs provide 5x throughput improvements over FlashAttention-2 for context windows > 64k tokens.",
          publishedYear: 2024,
        },
      ],
    },
    {
      topic: "Hardware-Aware Exact Sparse Tiling (FlashAttention-3)",
      status: "stable",
      growthRate: 38,
      evidence: [
        {
          id: "ev_evo_02",
          title: "Hardware-Accelerated Attention Kernel Architectures",
          locator: "NeurIPS 2024",
          excerpt: "Memory-bandwidth bounded attention is effectively saturated on H100 tensor cores using warp-specialized GEMM.",
          publishedYear: 2024,
        },
      ],
    },
    {
      topic: "Uncompressed Quadratic Dense Attention (O(N^2))",
      status: "declining",
      growthRate: -62,
      evidence: [
        {
          id: "ev_evo_03",
          title: "Survey of Long-Context Architectures",
          locator: "ACM Computing Surveys 2025",
          excerpt: "Dense quadratic attention is overwhelmingly abandoned for production models with context windows exceeding 32k tokens.",
          publishedYear: 2025,
        },
      ],
    },
  ],
  findings: [
    {
      id: "f_evo_01",
      title: "State-Space Models Surpassing Pure Attention in Long-Horizon Inference",
      summary:
        "Publication trajectories reveal a structural inflection in late 2024: hybrid SSM architectures now represent over 53% of new long-context submissions.",
      confidence: "high",
      evidence: [],
      limitations: ["Conference proceedings from late 2025 remain in peer review."],
      requiresHumanReview: false,
    },
  ],
  limitations: ["Citation counts normalize over 2-year lag periods."],
};

// 3. Research Question Stress Test Demo
export const DEMO_RESEARCH_QUESTION_RESULT: ResearchQuestionResult = {
  originalQuestion: "Can deep learning improve student engagement?",
  overallScore: 4.8,
  rubric: [
    { key: "clarity", name: "Clarity", score: 8, status: "pass", assessment: "Syntactically clear, but semantically ambiguous regarding target interventions." },
    { key: "specificity", name: "Specificity", score: 3, status: "critique", assessment: "'Deep learning' and 'student engagement' are vast umbrella concepts lacking operational definitions.", recommendation: "Specify the exact model architecture and course modality." },
    { key: "variables", name: "Variables", score: 4, status: "warning", assessment: "Independent variable is undefined; dependent variable lacks a measurable construct." },
    { key: "population", name: "Population & Context", score: 2, status: "critique", assessment: "No academic tier, demographic, discipline, or institution type specified.", recommendation: "Anchor to undergraduate CS students in inverted lecture formats." },
    { key: "measurability", name: "Measurability", score: 5, status: "warning", assessment: "Engagement cannot be measured directly without instrumentation (e.g., LMS telemetry, eye-tracking, exit slips)." },
    { key: "feasibility", name: "Feasibility", score: 6, status: "pass", assessment: "Feasible if focused on accessible LMS telemetry." },
    { key: "novelty", name: "Novelty Evidence", score: 4, status: "critique", assessment: "Over 8,000 papers evaluate general AI engagement; lacks distinct differentiation." },
    { key: "hypothesis", name: "Hypothesis Quality", score: 4, status: "warning", assessment: "Phrased as a binary yes/no question rather than an inquiry into mechanism or magnitude." },
    { key: "scope", name: "Scope", score: 3, status: "critique", assessment: "Scope is unmanageably wide for an empirical publication." },
  ],
  identifiedIssues: [
    "Vague independent variable: 'deep learning' could mean recommendation systems, generative tutoring, or predictive early warning.",
    "Unoperationalized outcome: 'engagement' conflates behavioral (logins), cognitive (time-on-task), and emotional engagement.",
    "Binary formulation: Can only answer 'yes' or 'no', offering no actionable insight into effect size.",
  ],
  alternatives: [
    {
      id: "alt_01",
      text: "How does LLM-generated Socratic scaffolding affect code-submission iteration frequency and self-reported cognitive engagement among first-year undergraduate CS students in introductory Python labs?",
      rationale: "Operationalizes the intervention (Socratic scaffolding), mechanism (code iteration), outcome (cognitive engagement), and sample cohort (CS1 undergraduates).",
      improvedDimensions: ["Specificity", "Variables", "Population & Context", "Measurability", "Scope"],
    },
    {
      id: "alt_02",
      text: "To what extent does multimodal attention tracking during asynchronous video lectures predict post-quiz retention variance compared to conventional LMS clickstream models?",
      rationale: "Sharpens the comparison against a baseline (clickstream) with quantifiable metrics (retention variance).",
      improvedDimensions: ["Novelty Evidence", "Measurability", "Hypothesis Quality"],
    },
  ],
  findings: [
    {
      id: "f_rq_01",
      title: "High Risk of Rejection Due to Conceptual Overbreadth",
      summary:
        "The original research question scores below publication thresholds across 5 of 9 rubric categories. Adopting Alternative 1 elevates specificity from 3/10 to 9/10.",
      confidence: "high",
      evidence: [],
      limitations: ["Evaluated against ACM SIGCSE and IEEE Transactions on Learning Technologies criteria."],
      requiresHumanReview: true,
    },
  ],
  limitations: ["Rubric weights aligned with empirical educational computer science standards."],
};

// 4. Research Decision Copilot Demo
export const DEMO_RESEARCH_DECISION_RESULT: ResearchDecisionResult = {
  criteria: [
    { id: "c_novelty", name: "Novelty Evidence", weight: 0.25, description: "Degree of differentiation from verified prior literature." },
    { id: "c_feasibility", name: "Feasibility", weight: 0.2, description: "Timeline, computational requirements, and ethical clearances." },
    { id: "c_data", name: "Data Availability", weight: 0.2, description: "Accessibility of high-fidelity ground truth datasets." },
    { id: "c_method", name: "Method Fit", weight: 0.15, description: "Alignment with team expertise and lab instrumentation." },
    { id: "c_impact", name: "Expected Contribution", weight: 0.1, description: "Potential citation yield, tier-1 venue fit, and grant alignment." },
    { id: "c_risk", name: "Risk Mitigation", weight: 0.1, description: "Likelihood of negative or non-publishable null results." },
  ],
  candidates: [
    {
      id: "cand_01",
      title: "Direction A: Micro-Satellite Constellation BFT Consensus",
      description: "Develop a predictive clock-skew compensation BFT protocol for non-GPS LEO mesh nodes.",
      scores: { c_novelty: 9.2, c_feasibility: 6.8, c_data: 6.0, c_method: 8.5, c_impact: 9.0, c_risk: 6.5 },
      totalWeightedScore: 7.74,
      evidenceCitations: [
        {
          id: "ev_dec_01",
          title: "NASA Orbital Debris & Mesh Telemetry Open Dataset",
          locator: "Table 4, Ephemeris data",
          excerpt: "Public ephemeris and inter-satellite crosslink logs available for 120 Starlink and OneWeb public telemetry passes.",
          publishedYear: 2024,
        },
      ],
      risks: ["Simulation-to-hardware fidelity gap without physical CubeSat testbed access."],
    },
    {
      id: "cand_02",
      title: "Direction B: Terrestrial 5G Edge Network BFT Optimization",
      description: "Apply standard BFT algorithms to mobile cell tower edge clusters with mmWave handover.",
      scores: { c_novelty: 5.1, c_feasibility: 9.0, c_data: 8.8, c_method: 8.0, c_impact: 6.2, c_risk: 8.5 },
      totalWeightedScore: 7.31,
      evidenceCitations: [],
      risks: ["Crowded research landscape with 400+ papers published between 2021-2024."],
    },
  ],
  recommendedCandidateId: "cand_01",
  recommendationRationale:
    "Direction A demonstrates a 9.2/10 verified novelty gap and aligns strongly with European Space Agency grant guidelines. While Direction B is more feasible, its novelty score (5.1) poses significant tier-1 venue acceptance hurdles.",
  findings: [
    {
      id: "f_dec_01",
      title: "Direction A Yields Optimal Risk-Reward for ERC Starting Grant",
      summary: "Weighted decision modeling confirms Direction A holds a 43% higher citation velocity potential despite higher data acquisition requirements.",
      confidence: "medium",
      evidence: [],
      limitations: ["Hardware lab budget assumed at $45,000."],
      requiresHumanReview: true,
    },
  ],
  limitations: ["User can adjust criterion weights dynamically to test sensitivity."],
};

// 5. Teaching PulseAI Demo
export const DEMO_TEACHING_PULSE_RESULT: TeachingPulseResult = {
  courseName: "CSE 3101: Design & Analysis of Algorithms",
  sessionDate: "Lecture 8: Dynamic Programming vs Memoization",
  timeline: [
    { date: "10:00", topic: "Intro: Fibonacci & DAGs", confusionRate: 12, sentimentScore: 84, sampleCount: 68 },
    { date: "10:20", topic: "Top-Down Memoization Recursion Tree", confusionRate: 24, sentimentScore: 76, sampleCount: 71 },
    { date: "10:40", topic: "Bottom-Up Tabulation State Transitions", confusionRate: 68, sentimentScore: 42, sampleCount: 74 },
    { date: "10:55", topic: "0/1 Knapsack Space Optimization", confusionRate: 79, sentimentScore: 36, sampleCount: 69 },
    { date: "11:15", topic: "Q&A & Exit Slips", confusionRate: 58, sentimentScore: 54, sampleCount: 72 },
  ],
  frictions: [
    {
      id: "fric_01",
      topic: "Space-Optimized 1D Array Transition in 0/1 Knapsack",
      frictionLevel: "high",
      studentFeedbackDirect: [
        "Why does the inner loop have to iterate backwards from W down to weight[i]?",
        "If I iterate forward, does it just turn into unbounded knapsack? I couldn't follow why.",
      ],
      teacherObservations: [
        "Students paused when writing the recurrence: noticed blank screens during live coding checkpoint.",
      ],
      dataDerivedPattern:
        "79% of exit slips flagged the 1D array loop direction as the primary stumbling block; 42% admitted guessing on the in-class poll.",
      aiHypothesis:
        "Students are confusing state dependency in the current row vs previous row because the 2D grid mental model was collapsed prematurely before mastering the row-by-row dependency invariant.",
    },
  ],
  actionPlan: [
    "Dedicate first 8 minutes of next lecture to live-tracing the 1D Knapsack array forward vs backward on a small example (W=5, items 2).",
    "Display side-by-side memory grids highlighting how forward iteration accidentally consumes the current item multiple times.",
    "Run Warm-Up Diagnostic Question #1 before introducing Longest Common Subsequence.",
  ],
  warmUpQuestions: [
    {
      id: "wu_01",
      question: "In 0/1 Knapsack, if the inner weight loop runs from 1 up to W instead of W down to 1 in a 1D array dp[w], which problem is actually solved?",
      options: [
        "A) The exact same 0/1 Knapsack problem with better cache locality.",
        "B) The Unbounded Knapsack problem (items can be chosen unlimited times).",
        "C) The Fractional Knapsack greedy variant.",
        "D) A syntax error resulting in index out of bounds.",
      ],
      correctAnswer: "B",
      explanation: "Iterating forward uses the newly updated dp[w - weight[i]] from the current iteration, allowing the same item to be added repeatedly.",
    },
    {
      id: "wu_02",
      question: "What is the space complexity of bottom-up 0/1 Knapsack when only the previous row values are maintained?",
      options: ["A) O(N * W)", "B) O(W)", "C) O(N)", "D) O(1)"],
      correctAnswer: "B",
      explanation: "Since row i only depends on row i-1, keeping a single row of size W+1 reduces space from O(N*W) to O(W).",
    },
    {
      id: "wu_03",
      question: "Why is Top-Down Memoization sometimes faster in practice than Bottom-Up Tabulation, even though both share the same worst-case asymptotic time complexity?",
      options: [
        "A) Memoization uses zero heap memory.",
        "B) Memoization only computes states that are reachable from the starting state, skipping unreachable subproblems.",
        "C) Compilers automatically vectorize recursive functions.",
        "D) Tabulation requires solving the dual linear program.",
      ],
      correctAnswer: "B",
      explanation: "If the subproblem state space contains unreachable configurations, top-down memoization skips them entirely.",
    },
  ],
  findings: [
    {
      id: "f_pulse_01",
      title: "Acute Confusion Peak at Minute 55 on 1D State Compression",
      summary:
        "Direct student exit slips demonstrate high conceptual ambiguity regarding inner loop reversal in dynamic programming tabulation.",
      confidence: "high",
      evidence: [
        {
          id: "ev_p_01",
          title: "PulseAI_Week3_ExitSlips.txt",
          locator: "Response #14, #27, #41",
          excerpt: "I still do not understand why backward loop prevents reuse in 1D knapsack.",
          publishedYear: 2025,
        },
      ],
      limitations: ["Sample consists of 72 responding students out of 84 enrolled."],
      requiresHumanReview: false,
    },
  ],
  limitations: ["Self-reported exit slips; student fatigue at end of session may slightly elevate negative sentiment scores."],
};

// 6. Query Clustering Demo
export const DEMO_QUERY_CLUSTERING_RESULT: QueryClusteringResult = {
  totalQueriesProcessed: 48,
  clusters: [
    {
      id: "cl_01",
      label: "Master Theorem Case 3 Regularity Condition",
      intentType: "conceptual",
      count: 24,
      syllabusTopicMap: "Module 2: Divide and Conquer Recurrences",
      rootCauseHypothesis: "Students understand f(n) = Omega(n^(log_b a + epsilon)) but fail to verify the regularity condition a*f(n/b) <= c*f(n) for c < 1.",
      representativeQuotes: [
        "'On HW2 Question 3, does 2^n satisfy regularity for T(n) = 4T(n/2) + 2^n?'",
        "'I proved case 3 but my TA deducted points for skipping the regularity check.'",
      ],
      suggestedBroadcast:
        "Announcement to CSE 3101: In Master Theorem Case 3, showing polynomial dominance is necessary but not sufficient. You must explicitly demonstrate the regularity condition: show there exists c < 1 such that a*f(n/b) <= c*f(n) for large n.",
      revisionSlideOutline: [
        "Slide 1: Why does Master Theorem Case 3 need regularity? (Preventing oscillating/pathological functions)",
        "Slide 2: Step-by-step verification on f(n) = n! vs f(n) = 2^n",
        "Slide 3: Common pitfall: when the limit test fails.",
      ],
    },
    {
      id: "cl_02",
      label: "Late Penalty & Autograder Token Allocation Policy",
      intentType: "administrative",
      count: 16,
      syllabusTopicMap: "Course Logistics / Policies",
      rootCauseHypothesis: "Unclear wording in syllabus Section 1.4 regarding whether 24-hour grace periods consume slip days automatically.",
      representativeQuotes: [
        "'Does submitting at 12:05 AM use my entire slip day or just a fractional penalty?'",
        "'My autograder ran out of submissions because of a compiler warning.'",
      ],
      suggestedBroadcast:
        "Hi everyone, reminder: grace periods are discrete 24-hour blocks. Submitting at 12:01 AM consumes 1 slip day. Autograder test tokens replenish every 6 hours.",
    },
    {
      id: "cl_03",
      label: "Recursion Tree Summation with Non-Constant Branching",
      intentType: "conceptual",
      count: 8,
      syllabusTopicMap: "Module 2: Divide and Conquer Recurrences",
      rootCauseHypothesis: "Students struggle to calculate tree height when subproblem sizes shrink non-uniformly (e.g., T(n) = T(n/3) + T(2n/3) + n).",
      representativeQuotes: [
        "'Which branch dictates the recursion tree height when subproblem sizes are unequal?'",
      ],
      suggestedBroadcast:
        "For unbalanced divide-and-conquer trees, the shortest branch terminates at log_3(n) while the longest branch extends to log_(3/2)(n). The tree is not uniform; sum row costs between these bounds.",
    },
  ],
  findings: [
    {
      id: "f_qc_01",
      title: "50% of Inquiries Concentrated in Single Recurrence Condition",
      summary: "24 of 48 student queries stem from Master Theorem Case 3 regularity check ambiguity.",
      confidence: "high",
      evidence: [],
      limitations: ["Data gathered from Piazza and office-hour queues over 72 hours."],
      requiresHumanReview: true,
    },
  ],
  limitations: ["Queries pre-anonymized before clustering."],
};

// 7. Exam Misconception Diagnostics Demo
export const DEMO_EXAM_MISCONCEPTION_RESULT: ExamMisconceptionResult = {
  examTitle: "CSE 2201: Data Structures Midterm Examination (Fall 2025)",
  totalStudents: 142,
  overallAverage: 67.4,
  questionDiagnostics: [
    {
      questionNumber: "Q1",
      topic: "Array Amortized Analysis",
      averageScorePercent: 88,
      difficultyLevel: "low",
      primaryMisconception: "None",
      commonDistractorOrError: "Occasional arithmetic errors on geometric series summation.",
      rootCause: "Standard textbook exercise with high procedural familiarity.",
      remedialConcept: "Reinforce aggregate method vs accounting method.",
    },
    {
      questionNumber: "Q2",
      topic: "Binary Search Tree Rotations",
      averageScorePercent: 74,
      difficultyLevel: "medium",
      primaryMisconception: "Left-Right Double Rotation Sequence",
      commonDistractorOrError: "Executing top rotation before bottom rotation.",
      rootCause: "Memorizing rotation diagrams without tracking parent pointer reassignments.",
      remedialConcept: "Trace 3-node balance invariants.",
    },
    {
      questionNumber: "Q3",
      topic: "Red-Black Tree Black-Height Invariant",
      averageScorePercent: 41,
      difficultyLevel: "high",
      primaryMisconception: "Counting Null Leaves in Black-Height",
      commonDistractorOrError: "63% omitted NIL leaves when verifying Property 5, concluding unbalanced trees were valid.",
      rootCause: "Conceptual confusion: treating NIL as empty air rather than sentinel black nodes.",
      remedialConcept: "Explicitly draw NIL square sentinel nodes in all lecture sketches.",
    },
    {
      questionNumber: "Q4",
      topic: "B-Tree Node Splitting",
      averageScorePercent: 52,
      difficultyLevel: "high",
      primaryMisconception: "Median Element Promotion to Parent",
      commonDistractorOrError: "Duplicating median in both left and right split children.",
      rootCause: "Conflating B+ Tree leaf behavior with internal B-tree nodes.",
      remedialConcept: "Contrast internal index nodes vs leaf data containers.",
    },
  ],
  remedialLessonPlan: {
    durationMinutes: 15,
    title: "The Sentinel Black-Height Invariant in Red-Black Trees",
    steps: [
      "Minute 1-4: The 'NIL Sentinel' visualization: draw all external pointers pointing to black ground pads.",
      "Minute 5-9: Interactive live counterexample: show a 3-node chain that appears valid until NIL leaves are drawn, revealing unequal black heights (2 vs 1).",
      "Minute 10-15: Student peer diagnostic drill on Question 3 clone.",
    ],
    alternativeAnalogy:
      "Think of Black-Height like walking down a building with multiple staircases. Every path from the roof (root) to the ground outside (NIL leaf) must pass through the exact same number of fire-doors (black nodes). If one path reaches the street with only 1 fire door while another requires 2, the building fails inspection.",
  },
  followUpDiagnosticQuestions: [
    {
      id: "diag_01",
      question: "In a valid Red-Black Tree, what is the minimum and maximum possible number of nodes on a path from the root to any NIL leaf if the black-height is B?",
      focusMisconception: "Path length alternation between red and black nodes.",
      explanation: "Minimum path is all black nodes (length B); maximum path alternates red and black (length 2B).",
    },
    {
      id: "diag_02",
      question: "If a Red-Black tree root node is red, what property is violated?",
      focusMisconception: "Root property (Property 2: The root is black).",
      explanation: "Property 2 explicitly mandates that the root must be black.",
    },
  ],
  findings: [
    {
      id: "f_exam_01",
      title: "Systemic Flaw on Question 3: 59% Failed Black-Height Sentinel Check",
      summary:
        "Analysis of 142 student answer sheets shows 84 students treated NIL pointers as non-existent, masking red-black violations.",
      confidence: "high",
      evidence: [
        {
          id: "ev_ex_01",
          documentId: "doc_02",
          title: "Midterm_Itemized_Marks.csv",
          locator: "Question 3 Itemized Breakdown",
          excerpt: "Mean score: 4.1/10. 84 students scored 0-3 points with identical error remarks.",
          publishedYear: 2025,
        },
      ],
      limitations: ["Marks normalized across 4 different graduate teaching assistant graders."],
      requiresHumanReview: true,
    },
  ],
  limitations: ["Grader calibration was within 4% variance."],
};

// 8. Student Portfolio & LOR Demo
export const DEMO_STUDENT_PORTFOLIO: StudentPortfolioData = {
  id: "std_alex_mercer",
  studentName: "Alex Mercer",
  studentIdNumber: "CS-2022-8841",
  department: "B.S. Computer Science, Year 4",
  gpa: 3.89,
  radarScores: {
    "Theoretical Rigor": 92,
    "Systems Programming": 96,
    "Research Independence": 88,
    "Leadership & Mentorship": 78,
    "Collaborative Teamwork": 85,
  },
  achievements: [
    {
      id: "ach_01",
      category: "research",
      title: "Lead Co-Author: Fast BFT Consensus in LEO Networks",
      description: "Submitted to IEEE INFOCOM 2025 student workshop; implemented ns-3 orbital simulation testbed.",
      date: "2025-06-15",
      verificationStatus: "faculty_verified",
      evidenceLocator: "Lab Report & GitHub repository under DEIL group",
    },
    {
      id: "ach_02",
      category: "academic",
      title: "Top 2% Ranked in CSE 3101 (Algorithms & Complexity)",
      description: "Achieved Grade A+; perfect score on midterm examination dynamic programming section.",
      date: "2024-12-20",
      verificationStatus: "issuer_verified",
      evidenceLocator: "Registrar Grade Audit CS-2022-8841",
    },
    {
      id: "ach_03",
      category: "leadership",
      title: "Head Teaching Assistant for CSE 1101 (Intro to CS)",
      description: "Mentored 120 students; led weekly recitation sessions and graded lab projects.",
      date: "2025-05-10",
      verificationStatus: "faculty_verified",
      evidenceLocator: "Faculty appointment record signed by Dr. Rostova",
    },
    {
      id: "ach_04",
      category: "technical",
      title: "1st Place Winner - ETH Zurich Distributed Systems Hackathon",
      description: "Built a zero-knowledge verifiable shuffle for decentralized voting.",
      date: "2024-10-12",
      verificationStatus: "student_submitted",
      evidenceLocator: "Certificate submitted by student; awaiting external verification",
    },
  ],
  workloadSignals: [
    {
      signal: "Heavy Capstone + TA Overlap",
      category: "credit_load",
      neutralObservation:
        "Student is currently enrolled in 22 ECTS credits including senior capstone while holding a 15 hr/week head TA position.",
    },
    {
      signal: "Concentrated Exam Window in Week 9",
      category: "deadline_clustering",
      neutralObservation: "Three major milestones coincide between November 12 and November 15.",
    },
  ],
  reviewStatus: "verified",
  findings: [
    {
      id: "f_port_01",
      title: "Exceptional Systems & Research Profile in Upper 3rd Percentile",
      summary: "Verified achievements confirm readiness for tier-1 doctoral research programs.",
      confidence: "high",
      evidence: [],
      limitations: ["Hackathon prize documentation remains student-submitted without third-party API verification."],
      requiresHumanReview: false,
    },
  ],
  limitations: ["Metrics reflect academic records through Spring 2025."],
};

export const DEMO_LOR_DOSSIER_RESULT: LorDossierResult = {
  studentName: "Alex Mercer",
  targetProgram: "Stanford University - Ph.D. in Computer Science (Systems & Networking)",
  requirementsMatrix: [
    {
      requirement: "Demonstrated capacity for independent original systems research",
      strengthEvidence: "Lead author on ns-3 orbital satellite simulation paper under Dr. Rostova; formulated custom clock-skew BFT protocol.",
      hasDirectEvidence: true,
      citationReference: "DEIL Lab Project Report 2025, Section 4",
    },
    {
      requirement: "Mastery of low-level systems programming and distributed protocols",
      strengthEvidence: "Completed Distributed Systems with Grade A+; implemented Raft from scratch in Rust.",
      hasDirectEvidence: true,
      citationReference: "Course Grade Sheet CSE 3201",
    },
    {
      requirement: "Effective academic communication and peer mentorship",
      strengthEvidence: "Head Teaching Assistant for CSE 1101; maintained 4.9/5.0 student evaluation score.",
      hasDirectEvidence: true,
      citationReference: "Department TA Evaluations Fall 2024",
    },
    {
      requirement: "Theoretical computer science and algorithm analysis foundation",
      strengthEvidence: "Grade A+ in CSE 3101; 92/100 theoretical rigor evaluation.",
      hasDirectEvidence: true,
      citationReference: "Registrar transcript verification",
    },
  ],
  strengthsDossier: [
    "Top 2% among over 300 undergraduates taught in the past 5 years.",
    "Rare combination of deep theoretical algorithm design with production-grade Rust systems implementation.",
    "Proven resilience when debugging non-deterministic distributed consensus simulations.",
  ],
  missingEvidenceWarnings: [
    "No formal peer-reviewed conference publication has completed review yet (currently under workshop submission).",
  ],
  lorOutline: [
    "Paragraph 1: Context of relationship (Research supervisor and professor for CSE 3101). Explicit ranking in top 2%.",
    "Paragraph 2: Research independence: Deep dive into satellite BFT protocol formulation and ns-3 simulation.",
    "Paragraph 3: Academic performance & systems mastery: Class performance in Algorithms and Rust implementation.",
    "Paragraph 4: Leadership, communication, and TA contributions.",
    "Paragraph 5: Unreserved recommendation for doctoral studies at Stanford.",
  ],
  initialDraftHtml: `<p>To the Stanford Graduate Admissions Committee,</p>
<p>It is my distinct privilege to offer my highest, unreserved recommendation for <strong>Alex Mercer</strong> for admission to the Ph.D. program in Computer Science at Stanford University. I have supervised Alex's research in the Distributed & Edge Intelligence Lab for the past eighteen months and previously instructed them in CSE 3101 (Design & Analysis of Algorithms). Among the more than 300 undergraduates I have mentored over the past five years, Alex firmly ranks in the top 2% in intellectual independence, technical precision, and research maturity.</p>
<p>Alex's primary research contribution in my laboratory focused on Byzantine Fault Tolerance (BFT) consensus in low-earth-orbit (LEO) satellite mesh topologies. Confronted with the severe challenge of relativistic Doppler clock drift and periodic inter-satellite link partitions, Alex independently developed a predictive topology-aware consensus protocol. Rather than relying on commercial off-the-shelf simulators, Alex authored a comprehensive simulation module in Rust and ns-3, demonstrating that quorum liveness could be preserved across orbital handovers. This work has been submitted to a premier international systems workshop and represents the caliber of work I routinely expect from advanced second-year doctoral candidates.</p>
<p>Beyond research acumen, Alex's mastery of foundational computer science is impeccable, having earned an A+ in both advanced algorithms and distributed systems. As our Head Teaching Assistant for introductory computer science, Alex demonstrated exemplary pedagogical empathy and clarity, earning a 4.9/5.0 rating across 120 enrolled students.</p>
<p>In summary, Alex Mercer possesses the rare combination of rigorous theoretical intuition, fearless systems engineering capability, and scholarly discipline necessary to excel in doctoral research. I recommend Alex without reservation and anticipate substantial contributions to the systems community.</p>
<p>Sincerely,</p>
<p><strong>Dr. Elena Rostova</strong><br/>Professor of Computer Science<br/>Director, Distributed & Edge Intelligence Lab</p>`,
  facultyApprovalStatus: "draft",
  findings: [
    {
      id: "f_lor_01",
      title: "All Core Program Admission Criteria Backed by Verifiable Records",
      summary: "Every superlative statement in the generated draft is linked directly to student transcripts and lab logs.",
      confidence: "high",
      evidence: [],
      limitations: ["Letter draft subject to faculty personal editing and institutional sign-off."],
      requiresHumanReview: true,
    },
  ],
  limitations: ["Draft requires final faculty review before digital signing."],
};

// 9. Curriculum Alignment Demo
export const DEMO_CURRICULUM_ALIGNMENT_RESULT: CurriculumAlignmentResult = {
  courseTitle: "CSE 4201: Cloud Computing & Distributed Systems Architecture",
  targetIndustrySector: "Cloud-Native Infrastructure & Site Reliability Engineering (2025)",
  alignmentScorePercent: 74,
  methodologyDescription:
    "Alignment computed by cross-referencing 24 syllabus learning outcomes against 3,840 verified Senior SRE and Cloud Systems job postings across Europe and North America (retrieved August 2025).",
  radarDimensions: [
    { dimension: "Containerization & Orchestration", syllabusScore: 85, industryNeed: 95 },
    { dimension: "Observability (eBPF / OpenTelemetry)", syllabusScore: 35, industryNeed: 90 },
    { dimension: "Infrastructure as Code", syllabusScore: 40, industryNeed: 88 },
    { dimension: "Distributed Consensus Fundamentals", syllabusScore: 92, industryNeed: 70 },
    { dimension: "Security & Secret Management", syllabusScore: 50, industryNeed: 82 },
    { dimension: "Fault Tolerance & Chaos Engineering", syllabusScore: 78, industryNeed: 85 },
  ],
  skillsMatrix: [
    { skillName: "Docker & Container Runtime Fundamentals", status: "current", industryDemandIndex: 94, syllabusCoverage: "comprehensive", evidenceJobCount: 3610 },
    { skillName: "Kubernetes Architecture & Custom Controllers", status: "current", industryDemandIndex: 91, syllabusCoverage: "introductory", evidenceJobCount: 3420 },
    { skillName: "eBPF Profiling & Kernel Tracing", status: "missing", industryDemandIndex: 82, syllabusCoverage: "absent", evidenceJobCount: 2240 },
    { skillName: "OpenTelemetry Distributed Tracing", status: "missing", industryDemandIndex: 86, syllabusCoverage: "absent", evidenceJobCount: 2890 },
    { skillName: "Apache Ant & XML Build Pipelines", status: "legacy", industryDemandIndex: 8, syllabusCoverage: "introductory", evidenceJobCount: 42 },
    { skillName: "SOAP Web Services & Monolithic Servlets", status: "legacy", industryDemandIndex: 12, syllabusCoverage: "introductory", evidenceJobCount: 110 },
  ],
  prioritizedMicroUpdates: [
    {
      priority: "high",
      recommendation: "Replace SOAP/Ant lecture in Week 4 with OpenTelemetry Distributed Tracing instrumentation in Go.",
      targetModule: "Module 2: Inter-Process Communication",
      rationale: "86% of current infrastructure postings require modern tracing telemetry; legacy SOAP retains less than 12% industry demand.",
    },
    {
      priority: "high",
      recommendation: "Introduce eBPF network observability in Week 9 instead of static socket polling.",
      targetModule: "Module 4: Performance Monitoring & Profiling",
      rationale: "eBPF has become the de-facto cloud-native networking standard across modern Linux deployments.",
    },
    {
      priority: "medium",
      recommendation: "Add GitOps / Terraform declarative IaC module to final project requirements.",
      targetModule: "Module 6: Deployment & Lifecycle",
      rationale: "Provides students with hands-on exposure to declarative configuration patterns.",
    },
  ],
  plugAndPlayLabs: [
    {
      title: "Lab 4: Instrumenting Microservices with OpenTelemetry & Grafana Tempo",
      estimatedHours: 3,
      modernTools: ["OpenTelemetry Go SDK", "Grafana", "Jaeger", "Docker Compose"],
      description: "Students instrument a 3-tier e-commerce microservice to track distributed latency spikes and trace propagation across HTTP headers.",
    },
    {
      title: "Lab 7: Writing a Minimal Kubernetes Reconciler Operator in Go",
      estimatedHours: 4,
      modernTools: ["Kubernetes", "Controller-Runtime", "Kind", "Go 1.23"],
      description: "Students build a custom resource definition (CRD) and implement a reconciliation loop that automatically provisions and scales resilient Redis clusters.",
    },
  ],
  retrievalDate: "2025-08-30",
  findings: [
    {
      id: "f_curr_01",
      title: "48% Gap in Cloud Observability Standards (OpenTelemetry & eBPF)",
      summary:
        "While distributed consensus theory is exceptionally strong, practical industry telemetry tools are absent from current lab modules.",
      confidence: "high",
      evidence: [],
      limitations: ["Job market postings reflect mid-to-senior level infrastructure positions."],
      requiresHumanReview: true,
    },
  ],
  limitations: ["Industry index samples enterprise cloud providers; startup tooling may vary."],
};

export const DEMO_ANALYSES: AnalysisRecord[] = [
  {
    id: "ana_gap_01",
    workspaceId: "ws_distrib_lab",
    type: "research_gap",
    title: "Orbital Satellite BFT Consensus Gap Verification",
    status: "completed",
    progressPercent: 100,
    currentStep: "Analysis complete",
    documentIds: ["doc_04"],
    input: {
      topic: "Satellite Swarm Consensus",
      claimedGap: "Asynchronous BFT under orbital Doppler clock drift without continuous GNSS lock",
    },
    findings: DEMO_RESEARCH_GAP_RESULT.findings,
    resultData: DEMO_RESEARCH_GAP_RESULT as unknown as Record<string, unknown>,
    limitations: DEMO_RESEARCH_GAP_RESULT.limitations,
    humanReviewApproved: true,
    humanReviewNotes: "Verified with lab doctoral candidate; approved for proposal drafting.",
    createdAt: "2025-09-03T14:00:00Z",
    updatedAt: "2025-09-03T14:02:15Z",
  },
  {
    id: "ana_exam_01",
    workspaceId: "ws_fall2025",
    type: "exam_misconception",
    title: "CSE 2201 Midterm Examination Misconception Analysis",
    status: "completed",
    progressPercent: 100,
    currentStep: "Analysis complete",
    documentIds: ["doc_01", "doc_02"],
    input: { examTitle: "CSE 2201 Midterm" },
    findings: DEMO_EXAM_MISCONCEPTION_RESULT.findings,
    resultData: DEMO_EXAM_MISCONCEPTION_RESULT as unknown as Record<string, unknown>,
    limitations: DEMO_EXAM_MISCONCEPTION_RESULT.limitations,
    humanReviewApproved: false,
    createdAt: "2025-09-02T12:00:00Z",
    updatedAt: "2025-09-02T12:03:10Z",
  },
  {
    id: "ana_pulse_01",
    workspaceId: "ws_fall2025",
    type: "teaching_pulse",
    title: "CSE 3101 Lecture 8 PulseAI Micro-Feedback",
    status: "completed",
    progressPercent: 100,
    currentStep: "Analysis complete",
    documentIds: ["doc_03"],
    input: { course: "CSE 3101", lecture: "Lecture 8" },
    findings: DEMO_TEACHING_PULSE_RESULT.findings,
    resultData: DEMO_TEACHING_PULSE_RESULT as unknown as Record<string, unknown>,
    limitations: DEMO_TEACHING_PULSE_RESULT.limitations,
    humanReviewApproved: true,
    createdAt: "2025-09-04T16:30:00Z",
    updatedAt: "2025-09-04T16:31:20Z",
  },
  {
    id: "ana_curr_01",
    workspaceId: "ws_fall2025",
    type: "curriculum_alignment",
    title: "CSE 4201 Cloud Computing Industry Alignment Audit",
    status: "completed",
    progressPercent: 100,
    currentStep: "Analysis complete",
    documentIds: [],
    input: { course: "CSE 4201", sector: "Cloud-Native Infrastructure" },
    findings: DEMO_CURRICULUM_ALIGNMENT_RESULT.findings,
    resultData: DEMO_CURRICULUM_ALIGNMENT_RESULT as unknown as Record<string, unknown>,
    limitations: DEMO_CURRICULUM_ALIGNMENT_RESULT.limitations,
    humanReviewApproved: false,
    createdAt: "2025-09-01T09:10:00Z",
    updatedAt: "2025-09-01T09:12:45Z",
  },
];
