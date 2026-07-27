#!/usr/bin/env python3
"""Generate phone-free public resume editions for the portfolio."""

from pathlib import Path
import shutil

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
DOWNLOAD_DIR = ROOT / "downloads"
PHOTO = ROOT / "images" / "devi-prasad-professional.jpeg"

AI_OUTPUT = OUTPUT_DIR / "devi-prasad-ai-cloud-resume.pdf"
AI_DOWNLOAD = DOWNLOAD_DIR / "devi-prasad-ai-cloud-resume.pdf"
VISUAL_OUTPUT = OUTPUT_DIR / "devi-prasad-visual-resume.pdf"
VISUAL_DOWNLOAD = DOWNLOAD_DIR / "devi-prasad-visual-resume.pdf"

GREEN = colors.HexColor("#0C7C64")
DARK = colors.HexColor("#263548")
INK = colors.HexColor("#1B2421")
MUTED = colors.HexColor("#596760")
PALE = colors.HexColor("#E7F0F1")
LIGHT = colors.HexColor("#F4F6F5")
WHITE = colors.white
TEAL = colors.HexColor("#4D9DA4")


def register_fonts():
    candidates = [
        (
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/System/Library/Fonts/Supplemental/Arial Italic.ttf",
        ),
        (
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
        ),
    ]
    for regular, bold, italic in candidates:
        if all(Path(path).exists() for path in (regular, bold, italic)):
            pdfmetrics.registerFont(TTFont("PublicSans", regular))
            pdfmetrics.registerFont(TTFont("PublicSansBold", bold))
            pdfmetrics.registerFont(TTFont("PublicSansItalic", italic))
            return "PublicSans", "PublicSansBold", "PublicSansItalic"
    return "Helvetica", "Helvetica-Bold", "Helvetica-Oblique"


REGULAR, BOLD, ITALIC = register_fonts()


def split_lines(text, max_width, font_name, font_size):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = word if not current else current + " " + word
        if pdfmetrics.stringWidth(candidate, font_name, font_size) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def wrapped_text(pdf, text, x, y, width, font_name=REGULAR, size=8.2, leading=10.2, color=INK):
    pdf.setFont(font_name, size)
    pdf.setFillColor(color)
    for line in split_lines(text, width, font_name, size):
        pdf.drawString(x, y, line)
        y -= leading
    return y


def bullet(pdf, text, x, y, width, size=8.0, leading=9.8, color=INK):
    pdf.setFont(BOLD, size)
    pdf.setFillColor(GREEN)
    pdf.drawString(x, y, "-")
    return wrapped_text(pdf, text, x + 11, y, width - 11, REGULAR, size, leading, color) - 2


def section_title(pdf, text, x, y, width, color=GREEN):
    pdf.setFont(BOLD, 8.1)
    pdf.setFillColor(color)
    pdf.drawString(x, y, text.upper())
    pdf.setStrokeColor(colors.HexColor("#BCD0CC"))
    pdf.setLineWidth(0.6)
    pdf.line(x, y - 4, x + width, y - 4)
    return y - 17


def role_heading(pdf, role, company, period, x, y, width, role_size=9.3):
    pdf.setFont(BOLD, role_size)
    pdf.setFillColor(DARK)
    pdf.drawString(x, y, role)
    role_width = pdfmetrics.stringWidth(role, BOLD, role_size)
    pdf.setFillColor(GREEN)
    pdf.drawString(x + role_width + 4, y, "| " + company)
    pdf.setFont(ITALIC, 7.2)
    pdf.setFillColor(MUTED)
    period_width = pdfmetrics.stringWidth(period, ITALIC, 7.2)
    pdf.drawString(x + width - period_width, y, period)
    return y - 13


def add_metadata(pdf, title, subject):
    pdf.setTitle(title)
    pdf.setAuthor("Devi Prasad Choudhary Ratnala")
    pdf.setSubject(subject)
    pdf.setKeywords("Java, Spring Boot, React, AI, RAG, agents, cloud, platform engineering")


def generate_ai_resume(path):
    width, height = letter
    pdf = canvas.Canvas(str(path), pagesize=letter, pageCompression=1)
    add_metadata(pdf, "Devi Prasad Ratnala - AI and Cloud Leadership Resume", "Public-safe AI and cloud engineering resume")

    margin = 36
    content_width = width - 2 * margin
    y = height - 38

    pdf.setFont(BOLD, 24)
    pdf.setFillColor(DARK)
    pdf.drawString(margin, y, "DEVI PRASAD CHOUDHARY RATNALA")
    y -= 19
    pdf.setFont(BOLD, 10)
    pdf.setFillColor(GREEN)
    pdf.drawString(margin, y, "LEAD SOFTWARE ENGINEER | AGENTIC AI, CLOUD AND DISTRIBUTED SYSTEMS")
    y -= 15
    pdf.setFont(REGULAR, 7.8)
    pdf.setFillColor(MUTED)
    pdf.drawString(
        margin,
        y,
        "Hyderabad, India | rdprassy@gmail.com | www.rdprassy.com | linkedin.com/in/rdprassy | github.com/rdprassy",
    )
    y -= 10
    pdf.setStrokeColor(colors.HexColor("#8FB7B0"))
    pdf.line(margin, y, width - margin, y)
    y -= 16

    y = section_title(pdf, "Professional summary", margin, y, content_width)
    y = wrapped_text(
        pdf,
        "Lead Software Engineer with 10+ years delivering enterprise AI products, cloud-native platforms, "
        "microservices, and full-stack applications. Expertise across Java, Spring Boot, Python, React, AWS, "
        "Azure, Kubernetes, retrieval-augmented generation, and multi-agent systems.",
        margin,
        y,
        content_width,
        size=8.4,
        leading=10.5,
    )
    y -= 6

    pdf.setFillColor(PALE)
    pdf.rect(margin, y - 18, content_width, 24, stroke=0, fill=1)
    pdf.setFillColor(GREEN)
    pdf.setFont(BOLD, 7.4)
    pdf.drawString(margin + 7, y - 2, "REPORTED SCALE")
    pdf.setFillColor(DARK)
    pdf.drawString(
        margin + 82,
        y - 2,
        "50 stakeholders | 5+ accounts | ~1,500 documents | 300+ monthly questions | 20+ pipelines",
    )
    pdf.setFillColor(GREEN)
    pdf.drawString(margin + 7, y - 13, "ESTIMATED IMPACT")
    pdf.setFillColor(DARK)
    pdf.drawString(margin + 82, y - 13, "25% faster analytics | 35% less research time | 10% faster incident response")
    y -= 32

    y = section_title(pdf, "Technical skills", margin, y, content_width)
    skills = [
        ("Languages and frameworks", "Java, Python, TypeScript, JavaScript, SQL, Spring Boot, Micronaut, Django, React, REST APIs, GraphQL, Hibernate"),
        ("Agentic AI and LLM engineering", "RAG, semantic search, LangChain, LangGraph, CrewAI, AutoGen, MCP, prompt engineering, fine-tuning, vector databases"),
        ("Cloud, architecture and data", "AWS, Azure, Lambda, Kubernetes, Docker, CI/CD, Kafka, microservices, Oracle, MongoDB, DynamoDB, Redis, Elasticsearch"),
    ]
    for label, value in skills:
        pdf.setFont(BOLD, 7.8)
        pdf.setFillColor(DARK)
        pdf.drawString(margin, y, label + ":")
        label_width = pdfmetrics.stringWidth(label + ": ", BOLD, 7.8)
        y = wrapped_text(pdf, value, margin + label_width, y, content_width - label_width, REGULAR, 7.8, 9.5)
        y -= 1
    y -= 4

    y = section_title(pdf, "Professional experience", margin, y, content_width)
    y = role_heading(pdf, "Lead Software Engineer", "PepsiCo", "2022 - Present", margin, y, content_width)
    y = bullet(pdf, "Launched AI-assisted Retail360 analytics for approximately 50 sales and operations stakeholders across 5+ retail accounts; estimated 25% faster analytics turnaround.", margin + 7, y, content_width - 7)
    y = bullet(pdf, "Built a RAG workflow indexing approximately 1,500 documents and supporting 300+ monthly questions; estimated 35% less research time.", margin + 7, y, content_width - 7)
    y = bullet(pdf, "Developed a multi-agent system monitoring 20+ data pipelines and triaging approximately 50 monthly failures; reported 10% faster incident response.", margin + 7, y, content_width - 7)
    y -= 2

    y = role_heading(pdf, "Senior Software Engineer", "Pegasystems", "2021 - 2022", margin, y, content_width)
    y = bullet(pdf, "Architected an event-driven email microservice handling approximately 25,000 monthly events and automated 10+ case-management workflows across three cross-functional teams.", margin + 7, y, content_width - 7)
    y -= 2

    y = role_heading(pdf, "Software Development Engineer", "Amazon and Oracle", "2020 - 2021", margin, y, content_width)
    y = bullet(pdf, "Built Amazon Impact with AWS Lambda, DynamoDB, and React for operational leadership; delivered Oracle product-change scheduling with Spring Boot and React/TypeScript.", margin + 7, y, content_width - 7)
    y -= 2

    y = role_heading(pdf, "Software Engineer", "Teradata and TCS", "2015 - 2020", margin, y, content_width)
    y = bullet(pdf, "Developed Vantage analytics tooling and automated approximately 200 monthly cloud installations with Python and Django; reported 42% faster provisioning.", margin + 7, y, content_width - 7)
    y = bullet(pdf, "Built a Spring Boot insurance-pricing engine and automated the end-to-end build process for more repeatable delivery.", margin + 7, y, content_width - 7)
    y -= 3

    y = section_title(pdf, "Credentials and education", margin, y, content_width)
    y = wrapped_text(
        pdf,
        "Microsoft Azure AI, Azure Data, and Azure Fundamentals | OCI Architect and Foundations Associate | "
        "Pega Certified System Architect | AI Engineer Core and Agentic tracks",
        margin,
        y,
        content_width,
        size=7.8,
        leading=9.4,
    )
    y -= 3
    y = wrapped_text(
        pdf,
        "B.Tech, Information Technology | JNTUK University College of Engineering, Vizianagaram | 2011 - 2015",
        margin,
        y,
        content_width,
        BOLD,
        7.8,
        9.4,
    )
    y -= 11
    y = section_title(pdf, "Selected public artifacts", margin, y, content_width)
    y = bullet(pdf, "Interactive retrieval lab with visible ranking, thresholds, evidence, citations, and hit-at-k evaluation.", margin + 7, y, content_width - 7, size=7.8, leading=9.4)
    y = bullet(pdf, "Public-safe OpenAPI contract for ingestion, retrieval, grounded answers, feedback, and health checks.", margin + 7, y, content_width - 7, size=7.8, leading=9.4)
    y = bullet(pdf, "AI release checklist and incident retrospective templates covering quality, security, cost, and operations.", margin + 7, y, content_width - 7, size=7.8, leading=9.4)
    y -= 5
    y = section_title(pdf, "Engineering principles", margin, y, content_width)
    wrapped_text(
        pdf,
        "Ground answers in evidence | Keep humans in control | Observe the full chain | Own incidents to root cause | Document decisions",
        margin,
        y,
        content_width,
        BOLD,
        7.8,
        9.4,
        DARK,
    )

    pdf.setFillColor(LIGHT)
    pdf.rect(0, 0, width, 18, stroke=0, fill=1)
    pdf.setFont(REGULAR, 6.5)
    pdf.setFillColor(MUTED)
    pdf.drawString(margin, 6, "PUBLIC-SAFE EDITION | CONTACT VIA EMAIL OR LINKEDIN")
    pdf.drawRightString(width - margin, 6, "WWW.RDPRASSY.COM")
    pdf.save()


def draw_tag(pdf, text, x, y, max_x):
    size = 7.2
    padding_x = 7
    tag_width = pdfmetrics.stringWidth(text, REGULAR, size) + padding_x * 2
    if x + tag_width > max_x:
        return None
    pdf.setFillColor(colors.HexColor("#9EA4AD"))
    pdf.roundRect(x, y - 12, tag_width, 17, 5, stroke=0, fill=1)
    pdf.setFillColor(WHITE)
    pdf.setFont(REGULAR, size)
    pdf.drawString(x + padding_x, y - 6, text)
    return x + tag_width + 5


def generate_visual_resume(path):
    width, height = A4
    pdf = canvas.Canvas(str(path), pagesize=A4, pageCompression=1)
    add_metadata(pdf, "Devi Prasad Ratnala - Lead Engineer Visual Resume", "Public-safe visual lead software engineer resume")

    left_margin = 38
    header_bottom = height - 177
    pdf.setFillColor(WHITE)
    pdf.rect(0, 0, width, height, stroke=0, fill=1)
    pdf.setFillColor(DARK)
    pdf.rect(0, height - 58, 24, 34, stroke=0, fill=1)

    pdf.setFont(REGULAR, 25)
    pdf.setFillColor(DARK)
    pdf.drawString(left_margin, height - 42, "Devi Prasad")
    pdf.drawString(left_margin, height - 71, "Choudhary")
    pdf.drawString(left_margin, height - 100, "Ratnala")
    pdf.setFont(REGULAR, 11)
    pdf.setFillColor(TEAL)
    pdf.drawString(left_margin, height - 121, "Lead Software Engineer")
    wrapped_text(
        pdf,
        "10+ years building enterprise applications at scale, with current focus on AI engineering, "
        "knowledge systems, cloud platforms, and operational reliability.",
        left_margin,
        height - 139,
        205,
        REGULAR,
        8.0,
        9.4,
        INK,
    )

    if PHOTO.exists():
        image = ImageReader(str(PHOTO))
        image_x = 250
        image_y = height - 132
        image_size = 82
        pdf.saveState()
        clip = pdf.beginPath()
        clip.circle(image_x + image_size / 2, image_y + image_size / 2, image_size / 2)
        pdf.clipPath(clip, stroke=0, fill=0)
        pdf.drawImage(image, image_x, image_y, image_size, image_size, preserveAspectRatio=True, anchor="c")
        pdf.restoreState()
        pdf.setStrokeColor(TEAL)
        pdf.setLineWidth(3)
        pdf.circle(image_x + image_size / 2, image_y + image_size / 2, image_size / 2, stroke=1, fill=0)

    contact_x = 390
    contact_y = height - 42
    contact_lines = [
        "rdprassy@gmail.com",
        "Hyderabad, India",
        "www.rdprassy.com",
        "linkedin.com/in/rdprassy",
        "github.com/rdprassy",
    ]
    pdf.setFont(REGULAR, 7.8)
    pdf.setFillColor(INK)
    for line in contact_lines:
        pdf.drawRightString(width - 32, contact_y, line)
        contact_y -= 21
    pdf.setStrokeColor(DARK)
    pdf.setLineWidth(0.6)
    pdf.line(0, header_bottom, width, header_bottom)

    left_x = left_margin
    left_width = 292
    right_x = 356
    right_width = width - right_x - 34
    y_left = header_bottom - 25
    y_right = y_left

    pdf.setFont(BOLD, 14)
    pdf.setFillColor(colors.black)
    pdf.drawString(left_x, y_left, "WORK EXPERIENCE")
    y_left -= 22

    roles = [
        (
            "Lead Software Engineer",
            "PepsiCo",
            "2022 - Present",
            [
                "Built Retail360, an AI-assisted analytics platform for sales and operations decision support.",
                "Built document RAG for context-grounded answers and semantic retrieval.",
                "Developed multi-agent pipeline monitoring and failure triage with automated alerts.",
            ],
        ),
        (
            "Senior Software Engineer",
            "Pegasystems",
            "2021 - 2022",
            [
                "Architected an event-driven email microservice using Kafka and asynchronous messaging.",
                "Engineered case-management workflows that reduced manual cross-team handoffs.",
            ],
        ),
        (
            "Software Development Engineer",
            "Amazon and Oracle",
            "2020 - 2021",
            [
                "Built Amazon Impact with AWS Lambda, DynamoDB, and React for operational insight.",
                "Delivered Oracle product-change scheduling with Spring Boot and React/TypeScript.",
            ],
        ),
        (
            "Software Engineer",
            "Teradata and TCS",
            "2015 - 2020",
            [
                "Built Vantage analytics tooling and a Django service for automated cloud installation.",
                "Built insurance-pricing logic and automated a fragile manual build process.",
            ],
        ),
    ]
    for role_name, company, period, bullets in roles:
        pdf.setFont(BOLD, 10.2)
        pdf.setFillColor(colors.black)
        pdf.drawString(left_x, y_left, role_name)
        y_left -= 13
        pdf.setFont(REGULAR, 9.4)
        pdf.drawString(left_x, y_left, company)
        pdf.setFont(ITALIC, 6.8)
        pdf.setFillColor(TEAL)
        pdf.drawRightString(left_x + left_width, y_left, period)
        y_left -= 13
        for item in bullets:
            y_left = bullet(pdf, item, left_x, y_left, left_width, size=7.5, leading=9.0)
        y_left -= 6

    pdf.setFont(BOLD, 14)
    pdf.setFillColor(colors.black)
    pdf.drawString(right_x, y_right, "SKILLS")
    y_right -= 25
    skills = [
        "Java", "Spring Boot", "React", "Python", "Kubernetes", "AWS / Azure",
        "RAG", "LangChain", "LangGraph", "CrewAI", "AutoGen", "MCP",
        "Vector DB", "Kafka", "Docker", "Microservices", "MongoDB", "Redis",
        "Elasticsearch", "GraphQL", "Prompt engineering", "Fine-tuning",
    ]
    tag_x = right_x
    for skill in skills:
        next_x = draw_tag(pdf, skill, tag_x, y_right, right_x + right_width)
        if next_x is None:
            y_right -= 22
            tag_x = right_x
            next_x = draw_tag(pdf, skill, tag_x, y_right, right_x + right_width)
        tag_x = next_x
    y_right -= 34

    y_right = section_title(pdf, "Certifications", right_x, y_right, right_width, TEAL)
    certifications = [
        "Microsoft Azure AI Fundamentals",
        "Microsoft Azure Data Fundamentals",
        "Microsoft Azure Fundamentals",
        "OCI Architect Associate",
        "OCI Foundations Associate",
        "Pega Certified System Architect",
    ]
    for certification in certifications:
        y_right = bullet(pdf, certification, right_x, y_right, right_width, size=7.2, leading=8.6)
    y_right -= 7

    y_right = section_title(pdf, "Education", right_x, y_right, right_width, TEAL)
    pdf.setFont(BOLD, 9.2)
    pdf.setFillColor(colors.black)
    pdf.drawString(right_x, y_right, "B.Tech, Information Technology")
    y_right -= 12
    y_right = wrapped_text(
        pdf,
        "JNTUK University College of Engineering, Vizianagaram | 2011 - 2015",
        right_x,
        y_right,
        right_width,
        REGULAR,
        7.4,
        9.0,
        MUTED,
    )
    y_right -= 10

    y_right = section_title(pdf, "Interests", right_x, y_right, right_width, TEAL)
    interests = ["AI engineering", "Scalable systems", "Architecture", "Writing", "Agentic workflows"]
    for interest in interests:
        pdf.setStrokeColor(colors.HexColor("#AAB0B5"))
        pdf.roundRect(right_x, y_right - 12, right_width, 18, 4, stroke=1, fill=0)
        pdf.setFont(REGULAR, 7.4)
        pdf.setFillColor(INK)
        pdf.drawCentredString(right_x + right_width / 2, y_right - 6, interest)
        y_right -= 23

    band_y = 48
    band_height = 98
    pdf.setFillColor(DARK)
    pdf.roundRect(left_margin, band_y, width - left_margin - 34, band_height, 12, stroke=0, fill=1)
    pdf.setFont(BOLD, 7.2)
    pdf.setFillColor(TEAL)
    pdf.drawString(left_margin + 16, band_y + band_height - 20, "REPORTED SCALE AND PUBLIC PROOF")
    metrics = [
        ("50", "stakeholders"),
        ("~1,500", "documents"),
        ("20+", "pipelines"),
        ("26", "public repos"),
    ]
    column_width = (width - left_margin - 34 - 32) / len(metrics)
    for index, (value, label) in enumerate(metrics):
        metric_x = left_margin + 16 + column_width * index
        pdf.setFont(BOLD, 16)
        pdf.setFillColor(WHITE)
        pdf.drawString(metric_x, band_y + 43, value)
        pdf.setFont(REGULAR, 7.0)
        pdf.setFillColor(colors.HexColor("#BFD3CD"))
        pdf.drawString(metric_x, band_y + 27, label)
    pdf.setFont(REGULAR, 7.0)
    pdf.setFillColor(colors.HexColor("#BFD3CD"))
    pdf.drawString(left_margin + 16, band_y + 11, "View the AI case study, live retrieval lab, and engineering artifacts at rdprassy.com")

    pdf.setFillColor(LIGHT)
    pdf.rect(0, 0, width, 18, stroke=0, fill=1)
    pdf.setFont(REGULAR, 6.5)
    pdf.setFillColor(MUTED)
    pdf.drawString(left_margin, 6, "PUBLIC-SAFE EDITION | PHONE-FREE")
    pdf.drawRightString(width - 34, 6, "WWW.RDPRASSY.COM")
    pdf.save()


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    generate_ai_resume(AI_OUTPUT)
    generate_visual_resume(VISUAL_OUTPUT)
    shutil.copy2(AI_OUTPUT, AI_DOWNLOAD)
    shutil.copy2(VISUAL_OUTPUT, VISUAL_DOWNLOAD)
    print(f"Generated {AI_OUTPUT}")
    print(f"Generated {VISUAL_OUTPUT}")
    print("Copied public-safe editions to downloads/")


if __name__ == "__main__":
    main()
