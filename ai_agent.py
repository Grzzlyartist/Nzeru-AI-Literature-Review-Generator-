import os
import asyncio
from typing import List, Dict, Any
from langchain_groq import ChatGroq
from langchain.schema import HumanMessage, SystemMessage
from langchain_community.tools import ArxivQueryRun
from langchain_community.utilities import ArxivAPIWrapper
import arxiv 
import json
import re
import aiohttp
from datetime import datetime

class LiteratureReviewAgent:
    def __init__(self):
        """Initialize the AI agent with Groq Cloud and tools"""
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            raise RuntimeError(
                "GROQ_API_KEY is not set. Please add it to your environment (e.g. in a .env file)."
            )

        # Default to Groq's free Llama model, but allow override via env.
        # You can override this with GROQ_MODEL_NAME in your environment, for example:
        # GROQ_MODEL_NAME=llama-3.1-8b-instant
        model_name = os.getenv("GROQ_MODEL_NAME", "llama-3.1-8b-instant")

        self.llm = ChatGroq(groq_api_key=groq_api_key, model_name=model_name)
        
        # Initialize ArXiv tool for academic paper search
        self.arxiv_tool = ArxivQueryRun(api_wrapper=ArxivAPIWrapper())
        
        # System prompt for literature review generation
        self.system_prompt = """You are an expert academic researcher and literature review specialist. Your task is to:

1. Analyze research topics and objectives to identify key themes
2. Search for relevant academic literature
3. Synthesize findings into comprehensive literature reviews
4. Maintain academic standards with proper citations

When generating literature reviews:
- Structure them with clear sections (Introduction, Methodology, Findings, Discussion, Conclusion)
- Include in‑text citations where appropriate (Author, Year)
- Maintain academic tone and rigor
- Highlight gaps in current research
- Provide critical analysis of existing literature
- For each major section, write at least 2–3 well‑developed paragraphs (not just bullet points)
- Ensure paragraphs are coherent, focused, and use clear transitions between ideas
- If asked, include a final "References (APA)" section listing the works cited using APA 7 formatting

Format in‑text citations as: (Author, Year) or Author (Year) depending on context."""

    # -------------------- Literature Searchers --------------------
    async def _search_arxiv(self, topic: str, max_results: int) -> List[Dict[str, Any]]:
        try:
            search_query = f"all:\"{topic}\""
            search = arxiv.Search(
                query=search_query,
                max_results=max_results,
                sort_by=arxiv.SortCriterion.SubmittedDate
            )
            papers = []
            for result in search.results():
                papers.append({
                    "title": result.title,
                    "authors": [author.name for author in result.authors],
                    "abstract": result.summary,
                    "published_date": result.published.strftime("%Y-%m-%d"),
                    "year": result.published.year,
                    "arxiv_id": result.entry_id,
                    "pdf_url": result.pdf_url,
                    "categories": result.categories,
                    "source": "arXiv"
                })
            return papers
        except Exception as e:
            print(f"arXiv search error: {e}")
            return []

    async def _search_openalex(self, session: aiohttp.ClientSession, topic: str, max_results: int) -> List[Dict[str, Any]]:
        try:
            params = {
                "search": topic,
                "per_page": max_results,
                "sort": "publication_year:desc"
            }
            async with session.get("https://api.openalex.org/works", params=params, timeout=20) as resp:
                if resp.status != 200:
                    return []
                data = await resp.json()
                items = data.get("results", [])
                papers = []
                for it in items:
                    title = it.get("title")
                    abstract = it.get("abstract") or (it.get("abstract_inverted_index") and " ".join(it.get("abstract_inverted_index").keys())) or ""
                    authors = [a.get("author", {}).get("display_name") for a in it.get("authorships", []) if a.get("author")]
                    primary_location = it.get("primary_location") or {}
                    pdf_url = (primary_location.get("source") or {}).get("host_page_url") or primary_location.get("pdf_url")
                    year = it.get("publication_year")
                    date_str = f"{year}-01-01" if year else None
                    url = it.get("id")
                    papers.append({
                        "title": title,
                        "authors": authors,
                        "abstract": abstract or "",
                        "published_date": date_str,
                        "year": year,
                        "pdf_url": pdf_url or url,
                        "arxiv_id": url,
                        "categories": [],
                        "source": "OpenAlex"
                    })
                return papers
        except Exception as e:
            print(f"OpenAlex search error: {e}")
            return []

    async def _search_crossref(self, session: aiohttp.ClientSession, topic: str, max_results: int) -> List[Dict[str, Any]]:
        try:
            params = {"query": topic, "rows": max_results, "sort": "issued", "order": "desc"}
            async with session.get("https://api.crossref.org/works", params=params, timeout=20) as resp:
                if resp.status != 200:
                    return []
                data = await resp.json()
                items = data.get("message", {}).get("items", [])
                papers = []
                for it in items:
                    title_list = it.get("title") or []
                    title = title_list[0] if title_list else None
                    authors = [f"{a.get('given','').strip()} {a.get('family','').strip()}".strip() for a in it.get("author", [])]
                    abstract = re.sub("<[^<]+?>", "", it.get("abstract", "")) if it.get("abstract") else ""
                    year = None
                    issued = it.get("issued", {}).get("'date-parts'", it.get("issued", {}).get("date-parts"))
                    if issued and isinstance(issued, list) and issued[0]:
                        year = issued[0][0]
                    url = it.get("URL")
                    papers.append({
                        "title": title,
                        "authors": authors,
                        "abstract": abstract,
                        "published_date": f"{year}-01-01" if year else None,
                        "year": year,
                        "pdf_url": url,
                        "arxiv_id": url,
                        "categories": [],
                        "source": "Crossref"
                    })
                return papers
        except Exception as e:
            print(f"Crossref search error: {e}")
            return []

    async def _search_semantic_scholar(self, session: aiohttp.ClientSession, topic: str, max_results: int) -> List[Dict[str, Any]]:
        try:
            params = {
                "query": topic,
                "limit": max_results,
                "fields": "title,abstract,authors,year,openAccessPdf,url"
            }
            async with session.get("https://api.semanticscholar.org/graph/v1/paper/search", params=params, timeout=20) as resp:
                if resp.status != 200:
                    return []
                data = await resp.json()
                items = data.get("data", [])
                papers = []
                for it in items:
                    title = it.get("title")
                    authors = [a.get("name") for a in it.get("authors", [])]
                    abstract = it.get("abstract") or ""
                    year = it.get("year")
                    pdf = (it.get("openAccessPdf") or {}).get("url")
                    url = it.get("url")
                    papers.append({
                        "title": title,
                        "authors": authors,
                        "abstract": abstract,
                        "published_date": f"{year}-01-01" if year else None,
                        "year": year,
                        "pdf_url": pdf or url,
                        "arxiv_id": url,
                        "categories": [],
                        "source": "Semantic Scholar"
                    })
                return papers
        except Exception as e:
            print(f"Semantic Scholar search error: {e}")
            return []

    def _dedupe_by_title(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        seen = set()
        deduped = []
        for p in items:
            title_key = (p.get("title") or "").strip().lower()
            if not title_key or title_key in seen:
                continue
            seen.add(title_key)
            deduped.append(p)
        return deduped

    async def search_literature(self, topic: str, max_results: int = 20) -> List[Dict]:
        """Search multiple platforms for relevant academic literature"""
        try:
            per_source = max(5, max_results // 3)
            async with aiohttp.ClientSession() as session:
                tasks = [
                    self._search_arxiv(topic, per_source),
                    self._search_openalex(session, topic, per_source),
                    self._search_crossref(session, topic, per_source),
                    self._search_semantic_scholar(session, topic, per_source)
                ]
                results = await asyncio.gather(*tasks, return_exceptions=True)

            combined: List[Dict[str, Any]] = []
            for r in results:
                if isinstance(r, list):
                    combined.extend(r)
            combined = self._dedupe_by_title(combined)
            combined.sort(key=lambda x: (x.get("year") or 0), reverse=True)
            return combined[:max_results]
        except Exception as e:
            print(f"Error searching literature: {e}")
            return []

    # -------------------- Analysis & Generation --------------------
    async def analyze_papers(self, papers: List[Dict], topic: str, objectives: str = "") -> str:
        """Analyze papers and generate a detailed, multi-paragraph literature review using AI"""
        try:
            papers_text = ""
            for i, paper in enumerate(papers[:10], 1):
                papers_text += f"""
Paper {i} ({paper.get('source','Unknown')}):
Title: {paper.get('title')}
Authors: {', '.join(paper.get('authors', []))}
Abstract: {paper.get('abstract')}
Published: {paper.get('published_date')}
Categories: {', '.join(paper.get('categories', []))}
URL: {paper.get('pdf_url')}

"""

            objectives_block = f"\nResearch Objectives to address:\n{objectives}\n" if objectives else ""
            analysis_prompt = f"""
Topic: {topic}
{objectives_block}
Based on the following academic papers collected from multiple platforms (arXiv, OpenAlex, Crossref, Semantic Scholar), generate a comprehensive and detailed literature review that explicitly addresses the objectives where provided.

{papers_text}

Please structure the literature review with the following sections, and for EACH section write around three substantial paragraphs of analysis and synthesis (not bullet points):
1. Introduction and Background
2. Current State of Research
3. Key Findings and Trends (map to objectives if available)
4. Research Gaps and Future Directions
5. Conclusion

Use an academic tone with appropriate in-text citations (Author, Year). Ensure each paragraph is well-developed, with clear topic sentences, supporting evidence, and explanatory commentary."""

            messages = [
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=analysis_prompt)
            ]
            response = await self.llm.ainvoke(messages)
            return response.content
        except Exception as e:
            print(f"Error analyzing papers: {e}")
            return f"Error generating literature review: {str(e)}"

    async def generate_review(self, topic: str, field: str = "general", 
                            max_sources: int = 20, review_length: str = "comprehensive", objectives: str = "") -> Dict[str, Any]:
        """Generate comprehensive literature review"""
        try:
            papers = await self.search_literature(topic, max_results=max_sources)
            if not papers:
                return {
                    "review": f"No relevant literature found for the topic: {topic}. Please try a different search term or broader topic.",
                    "sources": [],
                    "topic": topic,
                    "field": field,
                    "total_sources": 0
                }

            review = await self.analyze_papers(papers, topic, objectives)

            formatted_sources = []
            for paper in papers:
                abstract = paper.get("abstract") or ""
                formatted_sources.append({
                    "title": paper.get("title"),
                    "authors": paper.get("authors", []),
                    "year": str(paper.get("year")) if paper.get("year") else None,
                    "abstract": abstract[:200] + "..." if len(abstract) > 200 else abstract,
                    "url": paper.get("pdf_url"),
                    "arxiv_id": paper.get("arxiv_id"),
                    "source": paper.get("source")
                })

            # Build a simple APA 7 style reference list from available metadata
            apa_lines: List[str] = []
            for s in formatted_sources:
                authors = s.get("authors") or []
                year = s.get("year") or "n.d."
                title = (s.get("title") or "Untitled").strip().rstrip('.')
                url = s.get("url") or ""

                # Format authors: "Surname, Initial." joined by ", " and " & " for last
                def format_author(name: str) -> str:
                    parts = name.split()
                    if not parts:
                        return name
                    surname = parts[-1]
                    initials = ''.join([p[0].upper() + '.' for p in parts[:-1] if p])
                    return f"{surname}, {initials}" if initials else surname

                if authors:
                    formatted_authors = [format_author(a) for a in authors]
                    if len(formatted_authors) == 1:
                        author_str = formatted_authors[0]
                    elif len(formatted_authors) == 2:
                        author_str = f"{formatted_authors[0]} & {formatted_authors[1]}"
                    else:
                        author_str = ", ".join(formatted_authors[:-1]) + f", & {formatted_authors[-1]}"
                else:
                    author_str = "Author"

                apa_line = f"{author_str} ({year}). {title}. {url}".strip()
                apa_lines.append(apa_line)

            if apa_lines:
                review = f"{review}\n\nReferences (APA)\n" + "\n".join([f"- {line}" for line in apa_lines])

            return {
                "review": review,
                "sources": formatted_sources,
                "topic": topic,
                "field": field,
                "total_sources": len(papers)
            }
        except Exception as e:
            print(f"Error in generate_review: {e}")
            return {
                "review": f"An error occurred while generating the literature review: {str(e)}",
                "sources": [],
                "error": str(e)
            }

    async def get_review_summary(self, topic: str) -> str:
        """Get a brief summary of available literature for a topic"""
        try:
            papers = await self.search_literature(topic, max_results=5)
            if not papers:
                return f"No recent literature found for '{topic}'."
            summary_prompt = f"""
Topic: {topic}

Based on the following recent papers, provide a brief 2-3 sentence summary of current research trends:

{chr(10).join([f"- {p.get('title')} ({p.get('year')})" for p in papers])}

Summary:
"""
            messages = [
                SystemMessage(content="You are a research assistant. Provide concise summaries of academic literature."),
                HumanMessage(content=summary_prompt)
            ]
            response = await self.llm.ainvoke(messages)
            return response.content
        except Exception as e:
            return f"Error generating summary: {str(e)}"
