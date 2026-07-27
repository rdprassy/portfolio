(function () {
  const form = document.querySelector("[data-rag-form]");
  if (!form) {
    return;
  }

  const documents = [
    {
      id: "rag-scale",
      title: "Document intelligence scale",
      source: "AI & Cloud Leadership résumé",
      content: "A retrieval-augmented generation workflow indexed approximately 1,500 uploaded documents and supported more than 300 questions per month. Responses used retrieved context and semantic search to keep answers tied to source material.",
      answer: "the document-intelligence workflow indexed approximately 1,500 documents and supported more than 300 monthly questions through retrieval and semantic search",
      keywords: ["rag", "retrieval", "documents", "questions", "semantic", "search", "grounded"]
    },
    {
      id: "agent-reliability",
      title: "Multi-agent pipeline reliability",
      source: "AI & Cloud Leadership résumé",
      content: "A multi-agent system monitored more than 20 data pipelines and triaged approximately 50 failures per month. Automated alerts supported human incident ownership and were associated with a reported 10 percent reduction in incident response time.",
      answer: "agents monitored more than 20 pipelines, triaged approximately 50 monthly failures, and supported faster incident response through automated alerts",
      keywords: ["agent", "multi-agent", "pipeline", "failure", "incident", "reliability", "triage", "alerts"]
    },
    {
      id: "retail-analytics",
      title: "Retail360 decision support",
      source: "AI & Cloud Leadership résumé",
      content: "Retail360 delivered AI-assisted analytics to approximately 50 sales and operations stakeholders across more than five retail accounts. The supplied résumé estimates a 25 percent improvement in analytics turnaround time.",
      answer: "Retail360 supported approximately 50 stakeholders across more than five accounts, with an estimated 25 percent improvement in analytics turnaround",
      keywords: ["retail360", "analytics", "retail", "sales", "operations", "stakeholders", "decision"]
    },
    {
      id: "ai-toolkit",
      title: "Agentic AI toolkit",
      source: "Skills and certifications",
      content: "The documented AI toolkit includes LLM engineering, RAG, semantic search, vector databases, LangChain, LangGraph, CrewAI, AutoGen, Model Context Protocol, prompt engineering, fine-tuning, Azure AI, and multi-agent systems.",
      answer: "the documented AI toolkit spans RAG, semantic search, vector databases, LangChain, LangGraph, CrewAI, AutoGen, MCP, fine-tuning, and Azure AI",
      keywords: ["langchain", "langgraph", "crewai", "autogen", "mcp", "vector", "llm", "toolkit", "azure"]
    },
    {
      id: "cloud-impact",
      title: "Cloud automation outcomes",
      source: "Professional experience",
      content: "A Python and Django service automated approximately 200 monthly analytical-function installations on Vantage cloud clusters. The supplied résumé reports a 42 percent reduction in provisioning time.",
      answer: "cloud automation handled approximately 200 monthly analytical-function installations and reportedly reduced provisioning time by 42 percent",
      keywords: ["cloud", "automation", "django", "python", "provisioning", "installations", "vantage"]
    },
    {
      id: "incident-ownership",
      title: "Production incident ownership",
      source: "Experience page",
      content: "On the Amazon Impact application, high-severity incidents were carried from stabilization through root-cause resolution and durable fixes. The working principle is to treat incidents as engineering information, not only interruptions.",
      answer: "high-severity incidents were owned through stabilization, root-cause resolution, and durable corrective action",
      keywords: ["incident", "production", "root", "cause", "resolution", "amazon", "reliability"]
    },
    {
      id: "enterprise-stack",
      title: "Enterprise full-stack foundation",
      source: "Skills page",
      content: "The engineering foundation includes Java, Spring Boot, React, TypeScript, REST APIs, microservices, AWS Lambda, DynamoDB, Oracle, Azure, Kubernetes, Kafka, Docker, CI/CD, and operational ownership.",
      answer: "the enterprise foundation combines Java and Spring Boot services, React and TypeScript interfaces, cloud platforms, data systems, Kubernetes, Kafka, and delivery automation",
      keywords: ["java", "spring", "react", "typescript", "microservices", "aws", "azure", "kubernetes", "kafka"]
    },
    {
      id: "evaluation-principles",
      title: "AI evaluation principles",
      source: "Applied AI case study",
      content: "The AI evaluation contract covers retrieval hit rate, recall at k, access-filter correctness, answer groundedness, citation coverage, abstention quality, p95 latency, token cost, task completion, feedback, and escalation rate.",
      answer: "the evaluation approach measures retrieval, groundedness, citations, abstention, latency, cost, task completion, feedback, and escalation",
      keywords: ["evaluation", "groundedness", "citation", "recall", "latency", "cost", "feedback", "quality"]
    }
  ];

  const stopWords = new Set([
    "a", "an", "and", "are", "as", "at", "be", "been", "by", "did", "do", "does",
    "for", "from", "has", "have", "he", "his", "how", "in", "is", "it", "of", "on",
    "or", "that", "the", "this", "to", "was", "were", "what", "which", "with"
  ]);

  const queryInput = form.querySelector("[data-rag-query]");
  const topKInput = form.querySelector("[data-top-k]");
  const thresholdInput = form.querySelector("[data-threshold]");
  const thresholdOutput = form.querySelector("[data-threshold-output]");
  const answerElement = document.querySelector("[data-answer]");
  const citationsElement = document.querySelector("[data-citations]");
  const evidenceList = document.querySelector("[data-evidence-list]");
  const resultCount = document.querySelector("[data-result-count]");
  const timingElement = document.querySelector("[data-lab-timing]");
  const evaluationScore = document.querySelector("[data-evaluation-score]");
  const evaluationCopy = document.querySelector("[data-evaluation-copy]");
  const datasetGrid = document.querySelector("[data-dataset-grid]");
  const stageElements = Array.from(form.querySelectorAll("[data-stage]"));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function normalizeToken(token) {
    if (token.length > 5 && token.endsWith("ing")) {
      return token.slice(0, -3);
    }
    if (token.length > 4 && token.endsWith("ed")) {
      return token.slice(0, -2);
    }
    if (token.length > 4 && token.endsWith("s")) {
      return token.slice(0, -1);
    }
    return token;
  }

  function tokenize(value) {
    return (value.toLowerCase().match(/[a-z0-9-]+/g) || [])
      .map(normalizeToken)
      .filter(function (token) {
        return token.length > 1 && !stopWords.has(token);
      });
  }

  const tokenizedDocuments = documents.map(function (document) {
    return tokenize(document.title + " " + document.content + " " + document.keywords.join(" "));
  });

  function termFrequency(tokens) {
    const counts = new Map();
    tokens.forEach(function (token) {
      counts.set(token, (counts.get(token) || 0) + 1);
    });
    const total = tokens.length || 1;
    const frequencies = new Map();
    counts.forEach(function (count, token) {
      frequencies.set(token, count / total);
    });
    return frequencies;
  }

  function inverseDocumentFrequency(token) {
    const matchingDocuments = tokenizedDocuments.filter(function (tokens) {
      return tokens.includes(token);
    }).length;
    return Math.log((documents.length + 1) / (matchingDocuments + 1)) + 1;
  }

  function vectorize(tokens) {
    const frequencies = termFrequency(tokens);
    const vector = new Map();
    frequencies.forEach(function (frequency, token) {
      vector.set(token, frequency * inverseDocumentFrequency(token));
    });
    return vector;
  }

  function cosineSimilarity(first, second) {
    let dotProduct = 0;
    let firstMagnitude = 0;
    let secondMagnitude = 0;

    first.forEach(function (value, token) {
      dotProduct += value * (second.get(token) || 0);
      firstMagnitude += value * value;
    });
    second.forEach(function (value) {
      secondMagnitude += value * value;
    });

    if (!firstMagnitude || !secondMagnitude) {
      return 0;
    }
    return dotProduct / (Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude));
  }

  function rankDocuments(query) {
    const queryTokens = tokenize(query);
    const queryVector = vectorize(queryTokens);

    return documents.map(function (document, index) {
      const documentVector = vectorize(tokenizedDocuments[index]);
      const similarity = cosineSimilarity(queryVector, documentVector);
      const normalizedKeywords = document.keywords.map(normalizeToken);
      const keywordMatches = queryTokens.filter(function (token) {
        return normalizedKeywords.includes(token);
      }).length;
      const keywordBoost = Math.min(keywordMatches * 0.035, 0.14);
      return {
        document: document,
        score: Math.min(similarity + keywordBoost, 1),
        matchedTerms: queryTokens.filter(function (token) {
          return tokenizedDocuments[index].includes(token);
        })
      };
    }).sort(function (first, second) {
      return second.score - first.score;
    });
  }

  function wait(duration) {
    if (reducedMotion.matches) {
      return Promise.resolve();
    }
    return new Promise(function (resolve) {
      window.setTimeout(resolve, duration);
    });
  }

  async function animatePipeline() {
    stageElements.forEach(function (stage) {
      stage.classList.remove("is-active", "is-complete");
    });
    for (const stage of stageElements) {
      stage.classList.add("is-active");
      await wait(70);
      stage.classList.remove("is-active");
      stage.classList.add("is-complete");
    }
  }

  function renderEvidence(results) {
    evidenceList.replaceChildren();
    resultCount.textContent = results.length + (results.length === 1 ? " result" : " results");

    if (!results.length) {
      const empty = document.createElement("div");
      empty.className = "lab-empty";
      empty.innerHTML = "<strong>No evidence cleared the threshold.</strong><p>Lower the relevance threshold, increase the evidence count, or make the query more specific.</p>";
      evidenceList.appendChild(empty);
      return;
    }

    results.forEach(function (result, index) {
      const article = document.createElement("article");
      article.className = "evidence-card";
      article.id = "evidence-" + result.document.id;

      const header = document.createElement("div");
      header.className = "evidence-card__header";
      const rank = document.createElement("span");
      rank.className = "evidence-card__rank";
      rank.textContent = String(index + 1).padStart(2, "0");
      const heading = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = result.document.title;
      const source = document.createElement("span");
      source.textContent = result.document.source;
      heading.append(title, source);
      const score = document.createElement("strong");
      score.textContent = result.score.toFixed(3);
      header.append(rank, heading, score);

      const bar = document.createElement("div");
      bar.className = "evidence-card__bar";
      const fill = document.createElement("span");
      fill.style.width = Math.max(result.score * 100, 2) + "%";
      bar.appendChild(fill);

      const copy = document.createElement("p");
      copy.textContent = result.document.content;
      const terms = document.createElement("div");
      terms.className = "evidence-card__terms";
      terms.textContent = result.matchedTerms.length
        ? "Matched terms: " + Array.from(new Set(result.matchedTerms)).join(", ")
        : "Semantic overlap only";

      article.append(header, bar, copy, terms);
      evidenceList.appendChild(article);
    });
  }

  function renderAnswer(results) {
    citationsElement.replaceChildren();
    if (!results.length) {
      answerElement.textContent = "The available evidence is not relevant enough to answer this question. A production system should abstain or ask for clarification.";
      return;
    }

    answerElement.textContent = "The retrieved evidence indicates that " + results
      .slice(0, 2)
      .map(function (result, index) {
        return result.document.answer + " [" + String(index + 1) + "]";
      })
      .join(". It also shows that ") + ".";

    results.slice(0, 3).forEach(function (result, index) {
      const link = document.createElement("a");
      link.href = "#evidence-" + result.document.id;
      link.textContent = "[" + String(index + 1) + "] " + result.document.title;
      citationsElement.appendChild(link);
    });
  }

  function renderEvaluation(results) {
    const expectedId = form.dataset.expected || "";
    if (!expectedId) {
      evaluationScore.textContent = "Exploratory query";
      evaluationCopy.textContent = "No predefined evidence target is attached to this custom question. Inspect the ranked chunks and citations manually.";
      return;
    }

    const rank = results.findIndex(function (result) {
      return result.document.id === expectedId;
    });
    if (rank >= 0) {
      evaluationScore.textContent = "Expected evidence retrieved at rank " + String(rank + 1);
      evaluationCopy.textContent = "Hit@k: 100%. The expected evidence survived both ranking and the selected relevance threshold.";
    } else {
      evaluationScore.textContent = "Expected evidence missed";
      evaluationCopy.textContent = "Hit@k: 0%. Adjust the threshold or evidence count, then inspect which chunk displaced the expected result.";
    }
  }

  async function runRetrieval() {
    const startedAt = performance.now();
    const query = queryInput.value.trim();
    if (!query) {
      queryInput.focus();
      return;
    }

    const threshold = Number(thresholdInput.value) / 100;
    const topK = Number(topKInput.value);
    const pipelineAnimation = animatePipeline();
    const results = rankDocuments(query)
      .filter(function (result) { return result.score >= threshold; })
      .slice(0, topK);

    await pipelineAnimation;
    renderAnswer(results);
    renderEvidence(results);
    renderEvaluation(results);
    const duration = Math.max(performance.now() - startedAt, 1);
    timingElement.textContent = "Completed locally in " + duration.toFixed(1) + " ms";

    if (typeof window.rdprassyTrack === "function") {
      window.rdprassyTrack("ai_lab_run", {
        result_count: results.length,
        top_k: topK,
        threshold: threshold.toFixed(2),
        sample: form.dataset.expected || "custom"
      });
    }
  }

  function renderDataset() {
    documents.forEach(function (item, index) {
      const article = document.createElement("article");
      article.className = "dataset-card";
      const meta = document.createElement("span");
      meta.textContent = "CHUNK " + String(index + 1).padStart(2, "0") + " · " + item.id;
      const title = document.createElement("h3");
      title.textContent = item.title;
      const copy = document.createElement("p");
      copy.textContent = item.content;
      const source = document.createElement("small");
      source.textContent = "Source: " + item.source;
      article.append(meta, title, copy, source);
      datasetGrid.appendChild(article);
    });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    runRetrieval();
  });

  queryInput.addEventListener("input", function () {
    form.dataset.expected = "";
  });

  form.querySelectorAll("[data-sample-query]").forEach(function (button) {
    button.addEventListener("click", function () {
      queryInput.value = button.dataset.sampleQuery;
      form.dataset.expected = button.dataset.expected || "";
      runRetrieval();
    });
  });

  thresholdInput.addEventListener("input", function () {
    thresholdOutput.textContent = (Number(thresholdInput.value) / 100).toFixed(2);
  });

  renderDataset();
  form.dataset.expected = "agent-reliability";
  runRetrieval();
}());
