#!/usr/bin/env python3
"""Generate the downloadable two-page resume PDF."""

from pathlib import Path
import shutil

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "devi-prasad-resume.pdf"
DOWNLOAD = ROOT / "downloads" / "devi-prasad-resume.pdf"

PAGE_WIDTH, PAGE_HEIGHT = A4
GREEN = colors.HexColor("#0C7C64")
DARK = colors.HexColor("#102A25")
INK = colors.HexColor("#14231F")
MUTED = colors.HexColor("#52635D")
PALE = colors.HexColor("#E9F3EE")
LINE = colors.HexColor("#D8E1DC")
ORANGE = colors.HexColor("#EF9E56")
WHITE = colors.white


def register_fonts():
    font_candidates = [
        (
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        ),
        (
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ),
    ]
    for regular, bold in font_candidates:
        if Path(regular).exists() and Path(bold).exists():
            pdfmetrics.registerFont(TTFont("ResumeSans", regular))
            pdfmetrics.registerFont(TTFont("ResumeSansBold", bold))
            return "ResumeSans", "ResumeSansBold"
    return "Helvetica", "Helvetica-Bold"


REGULAR_FONT, BOLD_FONT = register_fonts()


def paragraph_style(name, **kwargs):
    base = getSampleStyleSheet()["BodyText"]
    values = {
        "fontName": REGULAR_FONT,
        "fontSize": 8.7,
        "leading": 12.1,
        "textColor": INK,
        "spaceAfter": 0,
    }
    values.update(kwargs)
    return ParagraphStyle(name, parent=base, **values)


STYLES = {
    "name": paragraph_style(
        "Name", fontName=BOLD_FONT, fontSize=29, leading=28.5, textColor=WHITE
    ),
    "headline": paragraph_style(
        "Headline", fontName=BOLD_FONT, fontSize=8, leading=10, textColor=ORANGE, uppercase=True
    ),
    "header_body": paragraph_style(
        "HeaderBody", fontSize=9.4, leading=13, textColor=colors.HexColor("#D8E7E2")
    ),
    "contact": paragraph_style(
        "Contact", fontSize=8, leading=12, textColor=WHITE, alignment=TA_RIGHT
    ),
    "section": paragraph_style(
        "Section", fontName=BOLD_FONT, fontSize=8, leading=10, textColor=GREEN
    ),
    "role": paragraph_style(
        "Role", fontName=BOLD_FONT, fontSize=10.2, leading=12.2, textColor=INK
    ),
    "date": paragraph_style(
        "Date", fontName=BOLD_FONT, fontSize=7.2, leading=9, textColor=GREEN, alignment=TA_RIGHT
    ),
    "company": paragraph_style(
        "Company", fontName=BOLD_FONT, fontSize=7.7, leading=10, textColor=MUTED
    ),
    "body": paragraph_style("Body"),
    "small": paragraph_style("Small", fontSize=7.8, leading=10.7, textColor=MUTED),
    "sidebar_title": paragraph_style(
        "SidebarTitle", fontName=BOLD_FONT, fontSize=8, leading=10, textColor=GREEN
    ),
    "sidebar_body": paragraph_style(
        "SidebarBody", fontSize=8.2, leading=11.5, textColor=INK
    ),
    "page_title": paragraph_style(
        "PageTitle", fontName=BOLD_FONT, fontSize=22, leading=24, textColor=DARK
    ),
    "quote": paragraph_style(
        "Quote", fontName=BOLD_FONT, fontSize=13, leading=18, textColor=DARK
    ),
}


def section_label(text):
    return KeepTogether(
        [
            Paragraph(text.upper(), STYLES["section"]),
            Spacer(1, 2.3 * mm),
            HRFlowable(width="100%", thickness=0.6, color=LINE),
            Spacer(1, 3.3 * mm),
        ]
    )


def role(title, date, company, body):
    heading = Table(
        [
            [
                Paragraph(title, STYLES["role"]),
                Paragraph(date, STYLES["date"]),
            ]
        ],
        colWidths=[125 * mm, 45 * mm],
        hAlign="LEFT",
    )
    heading.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return KeepTogether(
        [
            heading,
            Spacer(1, 0.7 * mm),
            Paragraph(company, STYLES["company"]),
            Spacer(1, 1.3 * mm),
            Paragraph(body, STYLES["body"]),
            Spacer(1, 4.0 * mm),
        ]
    )


def sidebar_block(title, items):
    content = [Paragraph(title.upper(), STYLES["sidebar_title"]), Spacer(1, 2 * mm)]
    for item in items:
        content.append(Paragraph("• " + item, STYLES["sidebar_body"]))
        content.append(Spacer(1, 1.1 * mm))
    return content


def draw_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(DARK)
    canvas.rect(0, PAGE_HEIGHT - 6 * mm, PAGE_WIDTH, 6 * mm, stroke=0, fill=1)
    canvas.setStrokeColor(LINE)
    canvas.line(20 * mm, 14 * mm, PAGE_WIDTH - 20 * mm, 14 * mm)
    canvas.setFont(REGULAR_FONT, 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, 9 * mm, "DEVI PRASAD CHOUDHARY RATNALA  /  RDPRASSY")
    canvas.drawRightString(
        PAGE_WIDTH - 20 * mm,
        9 * mm,
        f"WWW.RDPRASSY.COM  /  {doc.page}",
    )
    canvas.restoreState()


def build_story():
    story = []

    header_left = [
        Paragraph("FULL-STACK ENGINEER  /  PRODUCT BUILDER", STYLES["headline"]),
        Spacer(1, 3.5 * mm),
        Paragraph("Devi Prasad<br/>Choudhary Ratnala", STYLES["name"]),
        Spacer(1, 4 * mm),
        Paragraph(
            "Product-minded engineer with 10+ years across Java, Spring Boot, React, "
            "enterprise systems, cloud workflows, production ownership, and an expanding "
            "AI engineering toolkit.",
            STYLES["header_body"],
        ),
    ]
    header_right = [
        Paragraph(
            "Hyderabad, India<br/>"
            "<link href='mailto:rdprassy@gmail.com' color='#FFFFFF'>rdprassy@gmail.com</link><br/>"
            "<link href='https://www.rdprassy.com/' color='#FFFFFF'>www.rdprassy.com</link><br/>"
            "<link href='https://www.linkedin.com/in/rdprassy' color='#FFFFFF'>linkedin.com/in/rdprassy</link><br/>"
            "<link href='https://github.com/rdprassy' color='#FFFFFF'>github.com/rdprassy</link>",
            STYLES["contact"],
        )
    ]
    header = Table(
        [[header_left, header_right]],
        colWidths=[121 * mm, 49 * mm],
        hAlign="LEFT",
    )
    header.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), DARK),
                ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
                ("LEFTPADDING", (0, 0), (0, 0), 12 * mm),
                ("RIGHTPADDING", (0, 0), (0, 0), 7 * mm),
                ("LEFTPADDING", (1, 0), (1, 0), 5 * mm),
                ("RIGHTPADDING", (1, 0), (1, 0), 9 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 11 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 11 * mm),
                ("LINEBEFORE", (1, 0), (1, 0), 0.5, colors.HexColor("#35534A")),
            ]
        )
    )
    story.extend([header, Spacer(1, 9 * mm), section_label("Selected experience")])

    story.extend(
        [
            role(
                "Full-stack application engineering",
                "CURRENT",
                "PEPSICO  /  HYDERABAD",
                "Building and supporting business-facing applications in a global product "
                "environment across Java, Spring Boot, React, cloud, DevOps, and AI-enabled engineering.",
            ),
            role(
                "Platform microservice contribution",
                "2021 ONWARD",
                "PEGASYSTEMS PLATFORM",
                "Contributed to an enterprise platform microservice, applying service contracts, "
                "shared conventions, Pega architecture knowledge, and Oracle Cloud foundations.",
            ),
            role(
                "Operational insight product",
                "SEP 2020 - JUN 2021",
                "AMAZON IMPACT APPLICATION",
                "Built weekly operational-review workflows with AWS Lambda, DynamoDB, and React. "
                "Owned high-severity incident response through root-cause resolution and durable fixes.",
            ),
            role(
                "Cloud maintenance workflow",
                "MAR - SEP 2020",
                "ORACLE CLOUD PRODUCT CHANGE NOTIFICATIONS",
                "Developed Spring Boot and React/TypeScript scheduling flows, adding durable models "
                "that preserved product-change history for auditability.",
            ),
            role(
                "Analytics development environment",
                "JUL 2018 - FEB 2020",
                "TERADATA VANTAGE",
                "Built Eclipse RCP capabilities for analytical functions and a Django microservice "
                "that automated function installation during cloud-cluster provisioning.",
            ),
            role(
                "Premium calculation systems",
                "MAR 2016 - JUN 2018",
                "AXA GERMANY INSURANCE APPLICATION",
                "Implemented a Spring Boot premium-calculation engine and automated the application "
                "build process for more repeatable delivery.",
            ),
        ]
    )

    story.append(PageBreak())

    story.extend(
        [
            Paragraph("The toolkit behind the work.", STYLES["page_title"]),
            Spacer(1, 3 * mm),
            Paragraph(
                "Cross-stack fluency, operational responsibility, and continuous learning form the through-line.",
                STYLES["body"],
            ),
            Spacer(1, 8 * mm),
        ]
    )

    left_column = []
    left_column.extend(
        sidebar_block(
            "Core engineering",
            [
                "Java, Spring Boot, REST APIs, microservices",
                "React, TypeScript, JavaScript, product interfaces",
                "Python, Django, Eclipse RCP",
                "Oracle, DynamoDB, durable data models",
                "AWS Lambda, Azure, Oracle Cloud",
                "Docker, CI/CD, build and release automation",
            ],
        )
    )
    left_column.extend([Spacer(1, 5 * mm)])
    left_column.extend(
        sidebar_block(
            "AI engineering",
            [
                "LLM engineering and retrieval-augmented generation",
                "Agent architecture and Model Context Protocol",
                "QLoRA and model-adaptation foundations",
                "Azure AI services and responsible product integration",
            ],
        )
    )
    left_column.extend([Spacer(1, 5 * mm)])
    left_column.extend(
        sidebar_block(
            "Ways of working",
            [
                "System thinking from user workflow to failure mode",
                "High-severity incident ownership and root-cause resolution",
                "Clear technical writing and decision documentation",
                "English, Hindi, Telugu, and Oriya",
            ],
        )
    )

    right_column = []
    right_column.extend(
        [
            Paragraph("CREDENTIALS", STYLES["section"]),
            Spacer(1, 2.3 * mm),
            HRFlowable(width="100%", thickness=0.6, color=LINE),
            Spacer(1, 3.3 * mm),
        ]
    )
    credentials = [
        ("AI Engineer Core Track", "LLM engineering, RAG, QLoRA, agents  /  2026"),
        ("AI Engineer Agentic Track", "Agent architecture and MCP"),
        ("Microsoft Azure AI Fundamentals", "2025"),
        ("Microsoft Azure Data Fundamentals", "2025"),
        ("Microsoft Azure Fundamentals", "2024"),
        ("Pega Certified System Architect", "2021"),
        ("OCI Architect Associate", "2021"),
        ("OCI Foundations Associate", "2021"),
    ]
    for title, detail in credentials:
        right_column.append(Paragraph(title, STYLES["role"]))
        right_column.append(Paragraph(detail, STYLES["small"]))
        right_column.append(Spacer(1, 3.1 * mm))

    right_column.extend(
        [
            Spacer(1, 3 * mm),
            Paragraph("EDUCATION", STYLES["section"]),
            Spacer(1, 2.3 * mm),
            HRFlowable(width="100%", thickness=0.6, color=LINE),
            Spacer(1, 3.3 * mm),
            Paragraph("B.Tech, Information Technology", STYLES["role"]),
            Paragraph("JNTU Kakinada  /  2011 - 2015", STYLES["small"]),
            Spacer(1, 7 * mm),
            Paragraph("SELECTED PROJECT", STYLES["section"]),
            Spacer(1, 2.3 * mm),
            HRFlowable(width="100%", thickness=0.6, color=LINE),
            Spacer(1, 3.3 * mm),
            Paragraph("PSO Palmprint Recognition System", STYLES["role"]),
            Spacer(1, 1.3 * mm),
            Paragraph(
                "Designed a MATLAB biometric pipeline using Particle Swarm Optimization, "
                "Gabor filters, and Euclidean-distance matching.",
                STYLES["body"],
            ),
        ]
    )

    columns = Table(
        [[left_column, right_column]],
        colWidths=[78 * mm, 84 * mm],
        hAlign="LEFT",
    )
    columns.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 0), (0, 0), PALE),
                ("LEFTPADDING", (0, 0), (0, 0), 7 * mm),
                ("RIGHTPADDING", (0, 0), (0, 0), 7 * mm),
                ("TOPPADDING", (0, 0), (0, 0), 7 * mm),
                ("BOTTOMPADDING", (0, 0), (0, 0), 7 * mm),
                ("LEFTPADDING", (1, 0), (1, 0), 9 * mm),
                ("RIGHTPADDING", (1, 0), (1, 0), 0),
                ("TOPPADDING", (1, 0), (1, 0), 2 * mm),
                ("BOTTOMPADDING", (1, 0), (1, 0), 0),
            ]
        )
    )
    story.extend([columns, Spacer(1, 10 * mm)])

    proof = Table(
        [
            [
                Paragraph("PUBLIC PROOF", STYLES["headline"]),
                Paragraph(
                    "26 public repositories  /  product case studies  /  technical writing  /  "
                    "cloud and AI credentials",
                    STYLES["header_body"],
                ),
            ]
        ],
        colWidths=[36 * mm, 126 * mm],
    )
    proof.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), DARK),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 5 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5 * mm),
            ]
        )
    )
    story.append(proof)
    return story


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    DOWNLOAD.parent.mkdir(parents=True, exist_ok=True)

    document = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=15 * mm,
        bottomMargin=19 * mm,
        title="Resume - Devi Prasad Choudhary Ratnala",
        author="Devi Prasad Choudhary Ratnala",
        subject="Full-stack engineering resume",
    )
    frame = Frame(
        document.leftMargin,
        document.bottomMargin,
        document.width,
        document.height,
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )
    document.addPageTemplates([PageTemplate(id="Resume", frames=[frame], onPage=draw_page)])
    document.build(build_story())
    shutil.copy2(OUTPUT, DOWNLOAD)
    print(f"Generated {OUTPUT}")
    print(f"Copied {DOWNLOAD}")


if __name__ == "__main__":
    build_pdf()
