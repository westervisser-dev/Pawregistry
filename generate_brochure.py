#!/usr/bin/env python3
"""Generate a Paw Registry sales brochure PDF."""

import os
import time
from pathlib import Path

# ── Screenshots via Playwright ─────────────────────────────────────────────────

from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = Path("/tmp/pawregistry_screenshots")
SCREENSHOT_DIR.mkdir(exist_ok=True)

PAGES = [
    ("home_hero",       "http://localhost:5173/",       0,    1280, 680),
    ("home_commitment", "http://localhost:5173/",       520,  1280, 500),
    ("dogs",            "http://localhost:5173/dogs",   0,    1280, 620),
    ("litters",         "http://localhost:5173/litters",0,    1280, 560),
    ("apply",           "http://localhost:5173/apply",  0,    1280, 560),
    ("portal_login",    "http://localhost:5173/portal", 0,    1280, 480),
    ("admin_login",     "http://localhost:5173/admin",  0,    1280, 480),
]

print("Taking screenshots…")
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    for name, url, scroll_y, clip_w, clip_h in PAGES:
        page.goto(url, wait_until="networkidle")
        time.sleep(1.2)
        if scroll_y:
            page.evaluate(f"window.scrollTo(0, {scroll_y})")
            time.sleep(0.4)
        path = str(SCREENSHOT_DIR / f"{name}.png")
        page.screenshot(
            path=path,
            clip={"x": 0, "y": scroll_y if not scroll_y else 0,
                  "width": clip_w, "height": clip_h},
            full_page=False,
        )
        print(f"  ✓ {name}")
    browser.close()

print("Screenshots done.\n")

# ── PDF with ReportLab ─────────────────────────────────────────────────────────

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image as RLImage,
    HRFlowable, Table, TableStyle, PageBreak, KeepTogether,
)
from reportlab.platypus.flowables import HRFlowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage

# ── Colours ────────────────────────────────────────────────────────────────────
BRAND      = colors.HexColor("#9a6a2a")   # warm amber
BRAND_DARK = colors.HexColor("#45220a")
BRAND_LIGHT= colors.HexColor("#fdf6ee")
STONE      = colors.HexColor("#78716c")
STONE_DARK = colors.HexColor("#1c1917")
STONE_MID  = colors.HexColor("#d6d3d1")
WHITE      = colors.white
GREEN      = colors.HexColor("#16a34a")
BLUE       = colors.HexColor("#2563eb")

W, H = A4   # 595 × 842 pts
MARGIN = 18*mm

# ── Styles ─────────────────────────────────────────────────────────────────────
ss = getSampleStyleSheet()

def style(name, **kw):
    base = kw.pop("base", "Normal")
    s = ParagraphStyle(name, parent=ss[base], **kw)
    return s

S_COVER_TITLE = style("CoverTitle",
    fontName="Helvetica-Bold", fontSize=38, leading=46,
    textColor=WHITE, spaceAfter=10, alignment=TA_LEFT)
S_COVER_SUB = style("CoverSub",
    fontName="Helvetica", fontSize=14, leading=22,
    textColor=colors.HexColor("#f5ead8"), spaceAfter=20, alignment=TA_LEFT)
S_COVER_TAG = style("CoverTag",
    fontName="Helvetica-Bold", fontSize=11, leading=16,
    textColor=colors.HexColor("#f0c080"), spaceAfter=4, alignment=TA_LEFT)

S_H1 = style("H1",
    fontName="Helvetica-Bold", fontSize=22, leading=28,
    textColor=BRAND_DARK, spaceBefore=10, spaceAfter=6)
S_H2 = style("H2",
    fontName="Helvetica-Bold", fontSize=15, leading=20,
    textColor=BRAND_DARK, spaceBefore=8, spaceAfter=4)
S_H3 = style("H3",
    fontName="Helvetica-Bold", fontSize=11, leading=15,
    textColor=BRAND, spaceBefore=6, spaceAfter=3)
S_BODY = style("Body",
    fontName="Helvetica", fontSize=9.5, leading=15,
    textColor=STONE_DARK, spaceAfter=6)
S_BODY_SM = style("BodySm",
    fontName="Helvetica", fontSize=8.5, leading=13,
    textColor=STONE, spaceAfter=4)
S_CAPTION = style("Caption",
    fontName="Helvetica-Oblique", fontSize=7.5, leading=11,
    textColor=STONE, spaceAfter=8, alignment=TA_CENTER)
S_LABEL = style("Label",
    fontName="Helvetica-Bold", fontSize=8, leading=12,
    textColor=BRAND, spaceAfter=2)
S_BULLET = style("Bullet",
    fontName="Helvetica", fontSize=9.5, leading=15,
    textColor=STONE_DARK, spaceAfter=3, leftIndent=12, bulletIndent=0)
S_TAG = style("Tag",
    fontName="Helvetica-Bold", fontSize=8, leading=11,
    textColor=BRAND, spaceAfter=8)
S_FOOTER = style("Footer",
    fontName="Helvetica", fontSize=7.5, leading=10,
    textColor=STONE, alignment=TA_CENTER)
S_SECTION_LABEL = style("SectionLabel",
    fontName="Helvetica-Bold", fontSize=8, leading=11,
    textColor=BRAND, spaceBefore=2, spaceAfter=1, alignment=TA_LEFT)

# ── Helpers ────────────────────────────────────────────────────────────────────

def screenshot(name, width, caption=None):
    """Return an image flowable from our screenshots dir."""
    path = str(SCREENSHOT_DIR / f"{name}.png")
    img = PILImage.open(path)
    iw, ih = img.size
    height = width * ih / iw
    elems = [RLImage(path, width=width, height=height)]
    if caption:
        elems.append(Paragraph(caption, S_CAPTION))
    return elems

def divider(color=STONE_MID, thickness=0.5, space=8):
    return [Spacer(1, space), HRFlowable(width="100%", thickness=thickness, color=color, spaceAfter=space)]

def bullet(text):
    return Paragraph(f"<bullet>&bull;</bullet> {text}", S_BULLET)

def feature_row(items):
    """3-column feature table. items = [(icon_char, title, body), ...]"""
    cell_style = [
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('BACKGROUND', (0,0), (-1,-1), BRAND_LIGHT),
        ('ROUNDEDCORNERS', (0,0), (-1,-1), [4,4,4,4]),
        ('BOX', (0,0), (0,0), 0.5, STONE_MID),
        ('BOX', (1,0), (1,0), 0.5, STONE_MID),
        ('BOX', (2,0), (2,0), 0.5, STONE_MID),
    ]
    cells = []
    for (title, body) in items:
        cell = [Paragraph(title, S_H3), Paragraph(body, S_BODY_SM)]
        cells.append(cell)
    col = (W - 2*MARGIN - 8) / 3
    t = Table([cells], colWidths=[col, col, col], hAlign='LEFT')
    t.setStyle(TableStyle(cell_style))
    return t

def stage_badge(text, color):
    data = [[Paragraph(f"<font color='white'><b>{text}</b></font>",
                       ParagraphStyle("b", fontName="Helvetica-Bold", fontSize=7.5,
                                      leading=10, textColor=WHITE))]]
    t = Table(data, hAlign='LEFT')
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), color),
        ('LEFTPADDING', (0,0), (0,0), 5),
        ('RIGHTPADDING', (0,0), (0,0), 5),
        ('TOPPADDING', (0,0), (0,0), 2),
        ('BOTTOMPADDING', (0,0), (0,0), 2),
        ('ROUNDEDCORNERS', (0,0), (-1,-1), [3,3,3,3]),
    ]))
    return t


# ── Cover page background ──────────────────────────────────────────────────────

from reportlab.platypus import Flowable

class ColorRect(Flowable):
    def __init__(self, w, h, fill, radius=0):
        super().__init__()
        self.width = w; self.height = h; self.fill = fill; self.radius = radius
    def draw(self):
        self.canv.setFillColor(self.fill)
        if self.radius:
            self.canv.roundRect(0, 0, self.width, self.height, self.radius, fill=1, stroke=0)
        else:
            self.canv.rect(0, 0, self.width, self.height, fill=1, stroke=0)

class AbsoluteImage(Flowable):
    """Draw image at absolute page coords (for cover)."""
    def __init__(self, path, x, y, w, h, alpha=1.0):
        super().__init__()
        self.path = path; self.x = x; self.y = y
        self.w = w; self.h = h; self.alpha = alpha
        self.width = 0; self.height = 0
    def draw(self):
        self.canv.drawImage(self.path, self.x, self.y, self.w, self.h,
                            mask='auto', preserveAspectRatio=True)


# ── Build document ─────────────────────────────────────────────────────────────

OUTPUT = "/Users/westervisser/Desktop/Pawregistry/Paw_Registry_Brochure.pdf"

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN, bottomMargin=MARGIN,
    title="Paw Registry — Product Brochure",
    author="Paw Registry",
    subject="Complete breeding programme management platform",
)

story = []
CW = W - 2*MARGIN   # content width


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  PAGE 1 — COVER                                                              ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

# Full-bleed dark background using a table that spans the whole content area
cover_bg_h = H - 2*MARGIN

cover_content = [
    Spacer(1, 18),
    Paragraph("PAW REGISTRY", S_COVER_TAG),
    Spacer(1, 6),
    Paragraph("The complete platform\nfor thoughtful breeders.", S_COVER_TITLE),
    Spacer(1, 10),
    Paragraph(
        "Manage your dogs, litters, clients, and documents — all in one beautiful, "
        "custom-branded platform built specifically for professional dog breeders.",
        S_COVER_SUB,
    ),
    Spacer(1, 22),
]

# Three feature pills
pill_data = [
    [
        [Paragraph("Public website", ParagraphStyle("pt", fontName="Helvetica-Bold",
                   fontSize=9, textColor=BRAND_LIGHT, leading=13)),
         Paragraph("Showcase your dogs & litters", ParagraphStyle("pb", fontName="Helvetica",
                   fontSize=8, textColor=colors.HexColor("#d6c0a0"), leading=12))],
        [Paragraph("Client portal", ParagraphStyle("pt", fontName="Helvetica-Bold",
                   fontSize=9, textColor=BRAND_LIGHT, leading=13)),
         Paragraph("Applicants track their journey", ParagraphStyle("pb", fontName="Helvetica",
                   fontSize=8, textColor=colors.HexColor("#d6c0a0"), leading=12))],
        [Paragraph("Admin dashboard", ParagraphStyle("pt", fontName="Helvetica-Bold",
                   fontSize=9, textColor=BRAND_LIGHT, leading=13)),
         Paragraph("Full control over your programme", ParagraphStyle("pb", fontName="Helvetica",
                   fontSize=8, textColor=colors.HexColor("#d6c0a0"), leading=12))],
    ]
]
pill_t = Table(pill_data[0:1], colWidths=[CW/3-4, CW/3-4, CW/3-4], hAlign='LEFT')
pill_t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#5a3010")),
    ('LEFTPADDING', (0,0), (-1,-1), 10),
    ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ('TOPPADDING', (0,0), (-1,-1), 10),
    ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('LINEAFTER', (0,0), (1,0), 0.5, colors.HexColor("#7a4a20")),
]))

cover_content.append(pill_t)
cover_content.append(Spacer(1, 28))

# Hero screenshot inset
hero_img_path = str(SCREENSHOT_DIR / "home_hero.png")
img = PILImage.open(hero_img_path)
iw, ih = img.size
img_w = CW
img_h = img_w * ih / iw * 0.8  # slightly cropped feel
cover_content.append(
    Table([[RLImage(hero_img_path, width=img_w, height=img_h)]],
          colWidths=[img_w],
          style=TableStyle([
              ('LINEABOVE', (0,0), (-1,-1), 2, BRAND),
              ('LEFTPADDING', (0,0), (-1,-1), 0),
              ('RIGHTPADDING', (0,0), (-1,-1), 0),
              ('TOPPADDING', (0,0), (-1,-1), 0),
              ('BOTTOMPADDING', (0,0), (-1,-1), 0),
          ]))
)

# Wrap cover content in a dark background table
cover_table = Table(
    [[cover_content]],
    colWidths=[CW],
)
cover_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), BRAND_DARK),
    ('LEFTPADDING', (0,0), (-1,-1), 20),
    ('RIGHTPADDING', (0,0), (-1,-1), 20),
    ('TOPPADDING', (0,0), (-1,-1), 16),
    ('BOTTOMPADDING', (0,0), (-1,-1), 20),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
]))

story.append(cover_table)
story.append(PageBreak())


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  PAGE 2 — VALUE PROPOSITION                                                  ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

story.append(Paragraph("The problem with breeding administration", S_H1))
story += divider()
story.append(Paragraph(
    "Running a reputable breeding programme is demanding work. Between health testing, "
    "pedigree documentation, client communication, waitlist management, and post-placement support, "
    "breeders spend more time on administration than on what they love — the dogs.",
    S_BODY,
))
story.append(Paragraph(
    "Most breeders rely on spreadsheets, email chains, and social media DMs. "
    "This creates gaps: applicants fall through the cracks, documents get lost, "
    "and the breeder's professional brand is invisible.",
    S_BODY,
))
story.append(Spacer(1, 8))

story.append(Paragraph("Paw Registry changes that.", S_H2))
story.append(Paragraph(
    "A fully integrated, custom-branded platform that handles every stage of a puppy's "
    "journey — from the first enquiry through to placement and beyond.",
    S_BODY,
))
story.append(Spacer(1, 12))

# Value prop grid
vp_data = [
    ["One platform,\neverything included",
     "Your brand,\nyour way",
     "Save hours\nevery week"],
    ["Dogs, litters, clients, documents, "
     "emails, and updates — all connected "
     "and talking to each other.",
     "Customise your website copy, colours, "
     "dog profiles, email templates, and "
     "document checklists to match your "
     "programme's identity.",
     "Automated emails on stage changes, "
     "drag-and-drop waitlist ordering, and "
     "a self-serve client portal reduce "
     "back-and-forth by up to 80%."],
]
vp_header_style = ParagraphStyle("vph", fontName="Helvetica-Bold", fontSize=11,
                                  textColor=BRAND_DARK, leading=15, spaceAfter=4)
vp_body_style   = ParagraphStyle("vpb", fontName="Helvetica", fontSize=8.5,
                                  textColor=STONE_DARK, leading=13)

vp_col = (CW - 12) / 3
vp_cells = [
    [
        [Paragraph(vp_data[0][i].replace('\n', ' '), vp_header_style),
         Paragraph(vp_data[1][i], vp_body_style)]
        for i in range(3)
    ]
]
vp_t = Table(vp_cells, colWidths=[vp_col, vp_col, vp_col])
vp_t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), BRAND_LIGHT),
    ('LEFTPADDING', (0,0), (-1,-1), 12),
    ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ('TOPPADDING', (0,0), (-1,-1), 12),
    ('BOTTOMPADDING', (0,0), (-1,-1), 12),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('LINEAFTER', (0,0), (1,0), 0.5, STONE_MID),
    ('BOX', (0,0), (-1,-1), 0.5, STONE_MID),
]))
story.append(vp_t)
story.append(Spacer(1, 16))

# Commitment screenshot
story.append(Paragraph("Your public website — live on day one", S_H2))
story.append(Paragraph(
    "Every Paw Registry installation includes a polished public website where potential "
    "clients can browse your breeding dogs, view current and upcoming litters, read about "
    "your programme, and submit a detailed puppy application — all without any coding.",
    S_BODY,
))
story += screenshot("home_commitment", CW, "Homepage — 'Our Commitment' section showcasing health testing, verified pedigrees, and lifetime support")
story.append(PageBreak())


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  PAGE 3 — FEATURE DEEP DIVE: PUBLIC SITE + CLIENT PORTAL                    ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

story.append(Paragraph("Feature overview", S_H1))
story += divider()

# Dogs section
story.append(Paragraph("Dog profiles & breeding programme", S_H2))
left_col = CW * 0.52
right_col = CW - left_col - 6

img_path = str(SCREENSHOT_DIR / "dogs.png")
img = PILImage.open(img_path)
iw, ih = img.size
img_h = left_col * ih / iw

dogs_text = [
    Paragraph("Every breeding dog gets a rich, public-facing profile:", S_BODY_SM),
    bullet("High-resolution photo gallery"),
    bullet("Registered name, call name, breed, colour & sex"),
    bullet("OFA health results — hips, elbows, eyes, heart, DNA panels"),
    bullet("Multi-generation pedigree tree (up to 4 generations)"),
    bullet("Microchip & kennel club registration numbers"),
    bullet("Status: active, retired, or deceased"),
    Spacer(1, 6),
    Paragraph("Clients can filter by sex and explore each dog in detail before they apply — building trust before any conversation begins.", S_BODY_SM),
]
dogs_table = Table(
    [[RLImage(img_path, width=left_col, height=img_h), dogs_text]],
    colWidths=[left_col, right_col],
)
dogs_table.setStyle(TableStyle([
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('LEFTPADDING', (0,0), (-1,-1), 0),
    ('RIGHTPADDING', (0,0), (0,0), 8),
    ('TOPPADDING', (0,0), (-1,-1), 0),
    ('BOTTOMPADDING', (0,0), (-1,-1), 0),
]))
story.append(dogs_table)
story.append(Spacer(1, 14))

# Litters section
story.append(Paragraph("Litter management", S_H2))
story.append(Paragraph(
    "Track every litter from planning through to completion. Each litter has its own page with sire & dam details, "
    "puppy tracking (by collar colour), photo gallery, and availability count.",
    S_BODY,
))

img_path = str(SCREENSHOT_DIR / "litters.png")
img = PILImage.open(img_path)
iw, ih = img.size
litter_h = CW * ih / iw * 0.85
story.append(RLImage(img_path, width=CW, height=litter_h))
story.append(Paragraph("Litters page — showing planned, confirmed, weaning, and born litters with breed tags and availability", S_CAPTION))
story.append(Spacer(1, 4))

# Status badges inline
badge_data = [
    ["planned", "confirmed", "born", "weaning", "ready", "completed"],
    [colors.HexColor("#6b7280"), colors.HexColor("#2563eb"),
     colors.HexColor("#16a34a"), colors.HexColor("#d97706"),
     colors.HexColor("#9333ea"), colors.HexColor("#374151")],
]
badge_cells = [
    [Paragraph(f"<font color='white'><b>{label}</b></font>",
               ParagraphStyle("bl", fontName="Helvetica-Bold", fontSize=7.5,
                              textColor=WHITE, leading=10, alignment=TA_CENTER))
     for label in badge_data[0]]
]
b_col = CW / 6
badges_t = Table(badge_cells, colWidths=[b_col]*6)
badges_t.setStyle(TableStyle([
    ('BACKGROUND', (i,0), (i,0), badge_data[1][i]) for i in range(6)
] + [
    ('LEFTPADDING', (0,0), (-1,-1), 4),
    ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]))
story.append(Paragraph("Litter status progression:", S_LABEL))
story.append(badges_t)
story.append(PageBreak())


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  PAGE 4 — APPLICATION FORM + CLIENT PIPELINE                                 ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

story.append(Paragraph("Client lifecycle management", S_H1))
story += divider()

# Apply form
left_col = CW * 0.50
right_col = CW - left_col - 6

img_path = str(SCREENSHOT_DIR / "apply.png")
img = PILImage.open(img_path)
iw, ih = img.size
img_h = left_col * ih / iw

apply_text = [
    Paragraph("5-step puppy application", S_H2),
    Paragraph(
        "Prospective clients complete a thorough application that captures everything "
        "you need to make the right match:",
        S_BODY_SM,
    ),
    bullet("Personal details & contact info"),
    bullet("Home & life situation — housing type, garden, hours alone"),
    bullet("Experience with dogs & previous breeds owned"),
    bullet("Preferences — breed, sex, colour, timeframe"),
    bullet("Deposit intent & contract agreement"),
    Spacer(1, 6),
    Paragraph(
        "All data is stored in a structured format, searchable and reviewable in your admin dashboard. "
        "No more reading through email threads to remember what a family said.",
        S_BODY_SM,
    ),
]
apply_table = Table(
    [[apply_text, RLImage(img_path, width=left_col, height=img_h)]],
    colWidths=[right_col, left_col],
)
apply_table.setStyle(TableStyle([
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('LEFTPADDING', (0,0), (-1,-1), 0),
    ('RIGHTPADDING', (0,1), (0,1), 8),
    ('TOPPADDING', (0,0), (-1,-1), 0),
    ('BOTTOMPADDING', (0,0), (-1,-1), 0),
]))
story.append(apply_table)
story.append(Spacer(1, 16))

# Stage pipeline visual
story.append(Paragraph("7-stage client pipeline", S_H2))
story.append(Paragraph(
    "Every applicant moves through a clearly defined pipeline. Stage changes trigger "
    "automatic, customisable emails — keeping clients informed without any manual work.",
    S_BODY,
))
story.append(Spacer(1, 6))

stages = [
    ("Enquired",        "#6b7280", "Application received"),
    ("Approved",        "#2563eb", "Admin approves application"),
    ("Waitlisted",      "#0891b2", "All documents submitted"),
    ("Placed",          "#7c3aed", "Litter assigned"),
    ("Match Requested", "#d97706", "Awaiting puppy selection"),
    ("Matched",         "#16a34a", "Puppy selected by client"),
    ("Matched & Paid",  "#15803d", "Final payment received"),
]
stage_cells = []
for label, color_hex, desc in stages:
    c = colors.HexColor(color_hex)
    stage_cells.append([
        Paragraph(f"<font color='white'><b>{label}</b></font>",
                  ParagraphStyle("sl", fontName="Helvetica-Bold", fontSize=8,
                                 textColor=WHITE, leading=11, alignment=TA_CENTER)),
        Paragraph(desc, ParagraphStyle("sd", fontName="Helvetica", fontSize=8,
                                       textColor=STONE_DARK, leading=11)),
    ])

s_t = Table(stage_cells, colWidths=[110, CW-116])
ts_list = [
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('LEFTPADDING', (0,0), (-1,-1), 8),
    ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ('LINEBELOW', (0,0), (-1,-2), 0.5, WHITE),
    ('BOX', (0,0), (-1,-1), 0.5, STONE_MID),
]
for i, (_, color_hex, _) in enumerate(stages):
    ts_list.append(('BACKGROUND', (0,i), (0,i), colors.HexColor(color_hex)))
    ts_list.append(('BACKGROUND', (1,i), (1,i), BRAND_LIGHT if i % 2 == 0 else WHITE))
s_t.setStyle(TableStyle(ts_list))
story.append(s_t)
story.append(Spacer(1, 14))

# Email automation callout
callout_content = [
    [
        Paragraph("Automated email on every stage change", ParagraphStyle(
            "ch", fontName="Helvetica-Bold", fontSize=10, textColor=BRAND_DARK, leading=14)),
        Paragraph(
            "Each stage transition triggers a fully customisable email to the client. "
            "Edit the subject, body, and template variables (name, portal link, litter name) "
            "from the admin dashboard. Enable or disable any trigger individually.",
            ParagraphStyle("cb", fontName="Helvetica", fontSize=8.5, textColor=STONE_DARK, leading=13)),
    ]
]
callout_t = Table(callout_content, colWidths=[CW])
callout_t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fef9f0")),
    ('LEFTPADDING', (0,0), (-1,-1), 14),
    ('RIGHTPADDING', (0,0), (-1,-1), 14),
    ('TOPPADDING', (0,0), (-1,-1), 12),
    ('BOTTOMPADDING', (0,0), (-1,-1), 12),
    ('LINEBEFORE', (0,0), (0,0), 3, BRAND),
    ('BOX', (0,0), (-1,-1), 0.5, STONE_MID),
]))
story.append(callout_t)
story.append(PageBreak())


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  PAGE 5 — CLIENT PORTAL + ADMIN DASHBOARD                                    ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

story.append(Paragraph("The client experience", S_H1))
story += divider()

story.append(Paragraph(
    "Approved applicants receive a magic-link email to access their personal client portal — "
    "no passwords, no app to install. Just a link that opens their dashboard.",
    S_BODY,
))
story.append(Spacer(1, 8))

portal_features = [
    ("Dashboard & status",
     "Clients see exactly where they are in the process, with a plain-English description of their current stage and next steps."),
    ("Document checklist",
     "Admin uploads required documents (contracts, care guides, health records). Clients download, sign, and re-upload — all tracked with a progress bar."),
    ("Puppy updates",
     "Week-by-week journal posts with photos, targeted to the client's litter or specific puppy. Keeps families engaged from birth to go-home day."),
    ("Litter & puppy detail",
     "Once placed, clients can view their litter's page including puppy photos, collar colours, and available puppies for selection."),
    ("Go-home checklist",
     "A six-item checklist (vet check, microchip, contract, deposit, balance, puppy pack) with progress tracking and go-home date display."),
]

pf_cells = [[
    [Paragraph(t, S_H3), Paragraph(b, S_BODY_SM)]
    for t, b in portal_features[:3]
]]
pf_cells2 = [[
    [Paragraph(t, S_H3), Paragraph(b, S_BODY_SM)]
    for t, b in portal_features[3:]
]]

pf_col = (CW - 8) / 3
pf_t = Table(pf_cells, colWidths=[pf_col, pf_col, pf_col])
pf_t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), BRAND_LIGHT),
    ('LEFTPADDING', (0,0), (-1,-1), 10),
    ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ('TOPPADDING', (0,0), (-1,-1), 10),
    ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('LINEAFTER', (0,0), (1,0), 0.5, STONE_MID),
    ('BOX', (0,0), (-1,-1), 0.5, STONE_MID),
]))

pf_col2 = (CW - 8) / 2
pf_t2 = Table(pf_cells2, colWidths=[pf_col2, pf_col2])
pf_t2.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), BRAND_LIGHT),
    ('LEFTPADDING', (0,0), (-1,-1), 10),
    ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ('TOPPADDING', (0,0), (-1,-1), 10),
    ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('LINEAFTER', (0,0), (0,0), 0.5, STONE_MID),
    ('BOX', (0,0), (-1,-1), 0.5, STONE_MID),
]))
story.append(pf_t)
story.append(Spacer(1, 4))
story.append(pf_t2)
story.append(Spacer(1, 10))

# Portal login screenshot
img_path = str(SCREENSHOT_DIR / "portal_login.png")
img = PILImage.open(img_path)
iw, ih = img.size
portal_h = (CW * 0.45) * ih / iw

admin_img_path = str(SCREENSHOT_DIR / "admin_login.png")
admin_img = PILImage.open(admin_img_path)
aiw, aih = admin_img.size
admin_h = (CW * 0.45) * aih / aiw

img_col_w = CW * 0.45
gap = CW - 2*img_col_w
portal_admin_t = Table(
    [[RLImage(img_path, width=img_col_w, height=portal_h),
      RLImage(admin_img_path, width=img_col_w, height=admin_h)]],
    colWidths=[img_col_w, img_col_w],
    hAlign='CENTER',
)
portal_admin_t.setStyle(TableStyle([
    ('LEFTPADDING', (0,0), (-1,-1), 0),
    ('RIGHTPADDING', (0,0), (0,0), 8),
    ('TOPPADDING', (0,0), (-1,-1), 0),
    ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
]))
story.append(portal_admin_t)
story.append(Paragraph("Left: Client portal magic-link login   ·   Right: Breeder admin login", S_CAPTION))
story.append(PageBreak())


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  PAGE 6 — ADMIN CAPABILITIES                                                  ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

story.append(Paragraph("The admin dashboard", S_H1))
story += divider()
story.append(Paragraph(
    "The breeder's command centre. Every part of your programme is manageable from a single, "
    "clean interface — no spreadsheets, no email folders, no sticky notes.",
    S_BODY,
))
story.append(Spacer(1, 10))

admin_caps = [
    ("Dogs & health records",
     "Add, edit, and archive breeding dogs. Attach OFA certificates, DNA panel results, and "
     "vet records. Manage photo galleries with drag-and-drop ordering. Set sire/dam links "
     "for automatic pedigree generation."),
    ("Litter management",
     "Create litters by selecting sire & dam. Track status from planned to completed. Add "
     "individual puppies with collar colour coding. Upload up to 30 litter photos. Toggle "
     "public/private visibility per litter."),
    ("Waitlist & client ordering",
     "Drag-and-drop to reorder your waitlist. Separate tables for clients with deposit vs. "
     "without — so you always know who is most committed. One-click deposit status updates."),
    ("Document templates",
     "Upload contract templates, care guides, go-home packs, and invoices. Mark templates "
     "active to push them to client checklists automatically."),
    ("Email templates",
     "Edit the subject and body of every automated email. Use template variables like "
     "{{first_name}}, {{portal_link}}, {{litter_name}}. Enable or disable any trigger. "
     "Full send history logged per client."),
    ("Updates & puppy journal",
     "Post weekly updates targeted to a litter, puppy, or specific client. Attach up to "
     "three photos per post. Publish immediately or save as draft."),
    ("Puppy matching",
     "Assign a client to a litter, then request a match when puppies are ready. The client "
     "selects their puppy via the portal. System auto-transitions stages and notifies both parties."),
    ("Admin management",
     "Invite additional admins by email. Remove access instantly. Multiple admins can "
     "manage the programme simultaneously."),
]

ac_cols = 2
ac_col_w = (CW - 8) / ac_cols
rows = []
for i in range(0, len(admin_caps), ac_cols):
    row = []
    for j in range(ac_cols):
        if i + j < len(admin_caps):
            t, b = admin_caps[i+j]
            row.append([Paragraph(t, S_H3), Paragraph(b, S_BODY_SM)])
        else:
            row.append("")
    rows.append(row)

ac_t = Table(rows, colWidths=[ac_col_w, ac_col_w])
ac_ts = [
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('LEFTPADDING', (0,0), (-1,-1), 10),
    ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ('TOPPADDING', (0,0), (-1,-1), 8),
    ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ('BOX', (0,0), (-1,-1), 0.5, STONE_MID),
    ('LINEAFTER', (0,0), (0,-1), 0.5, STONE_MID),
]
for i in range(len(rows)):
    bg = BRAND_LIGHT if i % 2 == 0 else WHITE
    ac_ts.append(('BACKGROUND', (0,i), (-1,i), bg))
    if i < len(rows)-1:
        ac_ts.append(('LINEBELOW', (0,i), (-1,i), 0.5, STONE_MID))
ac_t.setStyle(TableStyle(ac_ts))
story.append(ac_t)
story.append(PageBreak())


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  PAGE 7 — TAILORING / CUSTOMISATION                                          ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

story.append(Paragraph("Tailored to your programme", S_H1))
story += divider()
story.append(Paragraph(
    "Paw Registry is not a generic off-the-shelf product. Every installation is "
    "configured specifically for the breeder's programme — from brand identity to "
    "workflow automation.",
    S_BODY,
))
story.append(Spacer(1, 10))

customisations = [
    ("Brand & identity",
     [
         "Your kennel name, logo, and tagline throughout the site",
         "Custom colour palette matching your existing brand",
         "Serif + sans-serif font pairing for an elegant, professional look",
         "Footer with your contact details and social links",
     ]),
    ("Dog & breed configuration",
     [
         "Any breed or cross-breed — the system is breed-agnostic",
         "Custom breed labels per litter (e.g. 'F1b Golden Doodle', 'Border Doodle')",
         "Health test types configurable to your breed's standard requirements",
         "Pedigree depth adjustable per breeding line",
     ]),
    ("Application form",
     [
         "Questions can be tailored to your specific requirements",
         "Country default pre-filled (e.g. ZA for South Africa)",
         "Deposit amount set per litter",
         "Contract agreement checkbox linked to your specific contract",
     ]),
    ("Email templates",
     [
         "Every automated email written in your voice",
         "Custom subject lines and body copy per trigger",
         "Template variables include your portal URL and programme name",
         "Sender name and reply-to address set to your details",
     ]),
    ("Document workflow",
     [
         "Upload your own contract PDF as a template",
         "Require any combination of documents before waitlisting",
         "Custom document categories (contracts, health, care, invoices)",
         "Document checklist items shown in your preferred order",
     ]),
    ("Waitlist rules",
     [
         "Define your own deposit amount and deposit status criteria",
         "Separate waitlist tables for deposited vs. non-deposited clients",
         "Priority ordering fully in your control via drag-and-drop",
         "Stage names and email copy reflect your terminology",
     ]),
]

for section_title, points in customisations:
    row_items = [
        [Paragraph(section_title, S_H3)] + [bullet(p) for p in points]
    ]
    r_t = Table([[row_items[0]]], colWidths=[CW])
    r_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BRAND_LIGHT),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('BOX', (0,0), (-1,-1), 0.5, STONE_MID),
        ('LINEBEFORE', (0,0), (0,-1), 3, BRAND),
    ]))
    story.append(r_t)
    story.append(Spacer(1, 5))

story.append(Spacer(1, 10))

# Tailoring callout box
tailor_text = [
    [Paragraph("Every Paw Registry installation is set up and maintained by the development team — "
               "you never need to touch code. Changes to copy, colours, templates, and configuration "
               "are handled as part of the ongoing service.",
               ParagraphStyle("tc", fontName="Helvetica-Oblique", fontSize=9.5,
                              textColor=BRAND_DARK, leading=15))]
]
tailor_t = Table(tailor_text, colWidths=[CW])
tailor_t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fef3e2")),
    ('LEFTPADDING', (0,0), (-1,-1), 16),
    ('RIGHTPADDING', (0,0), (-1,-1), 16),
    ('TOPPADDING', (0,0), (-1,-1), 14),
    ('BOTTOMPADDING', (0,0), (-1,-1), 14),
    ('BOX', (0,0), (-1,-1), 1, BRAND),
]))
story.append(tailor_t)
story.append(PageBreak())


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  PAGE 8 — ADVANTAGES SUMMARY + CLOSING                                       ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

story.append(Paragraph("Why Paw Registry?", S_H1))
story += divider()

advantages = [
    ("Purpose-built for breeders",
     "Unlike generic CRMs or spreadsheet templates, Paw Registry is designed from the ground up "
     "around the specific workflows of a responsible breeding programme. Every feature reflects "
     "how thoughtful breeders actually work."),
    ("End-to-end type safety",
     "Built with TypeScript throughout — frontend, backend, and database schema. This means "
     "fewer bugs, faster development, and a system that stays reliable as your programme grows."),
    ("Clients feel looked after",
     "The client portal gives applicants a professional, reassuring experience from first "
     "application through to puppy placement. They can track their own progress, access "
     "documents, and read puppy updates — without needing to message you constantly."),
    ("No data silos",
     "Everything is connected. A dog links to its litters. A litter links to its puppies and "
     "clients. A client links to their documents, emails, and matched puppy. Nothing lives in "
     "a separate spreadsheet."),
    ("Grows with your programme",
     "Whether you place 4 puppies a year or 40, Paw Registry scales with you. Add new breeds, "
     "new litters, new admins, and new document types without restructuring anything."),
    ("Secure by design",
     "Authentication via Supabase magic links (no passwords to leak). Admin access controlled "
     "by server-side UUID validation. Client data isolated per user. Files stored in secure "
     "cloud buckets with signed URLs."),
    ("Mobile-friendly",
     "The public site, client portal, and admin dashboard all work on mobile. Clients can "
     "upload documents from their phone. You can check your waitlist on the go."),
    ("Backed by modern infrastructure",
     "Deployed on Railway with Supabase Postgres and file storage. Production-grade reliability "
     "with zero maintenance burden on the breeder."),
]

adv_col = (CW - 8) / 2
adv_rows = []
for i in range(0, len(advantages), 2):
    row = []
    for j in range(2):
        if i+j < len(advantages):
            t, b = advantages[i+j]
            row.append([Paragraph(t, S_H3), Paragraph(b, S_BODY_SM)])
        else:
            row.append("")
    adv_rows.append(row)

adv_t = Table(adv_rows, colWidths=[adv_col, adv_col])
adv_ts = [
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('LEFTPADDING', (0,0), (-1,-1), 10),
    ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ('TOPPADDING', (0,0), (-1,-1), 9),
    ('BOTTOMPADDING', (0,0), (-1,-1), 9),
    ('BOX', (0,0), (-1,-1), 0.5, STONE_MID),
    ('LINEAFTER', (0,0), (0,-1), 0.5, STONE_MID),
]
for i in range(len(adv_rows)):
    bg = BRAND_LIGHT if i % 2 == 0 else WHITE
    adv_ts.append(('BACKGROUND', (0,i), (-1,i), bg))
    if i < len(adv_rows)-1:
        adv_ts.append(('LINEBELOW', (0,i), (-1,i), 0.5, STONE_MID))
adv_t.setStyle(TableStyle(adv_ts))
story.append(adv_t)
story.append(Spacer(1, 20))

# Closing CTA
cta_content = [
    [
        Paragraph("Ready to modernise your breeding programme?",
                  ParagraphStyle("ctah", fontName="Helvetica-Bold", fontSize=14,
                                 textColor=WHITE, leading=20, spaceAfter=6)),
        Paragraph(
            "Paw Registry is available as a fully managed, custom-configured installation "
            "for reputable breeders. Get in touch to discuss your programme and see a "
            "live demonstration tailored to your breed.",
            ParagraphStyle("ctab", fontName="Helvetica", fontSize=9.5,
                           textColor=colors.HexColor("#f5ead8"), leading=15, spaceAfter=12)),
        Paragraph("info@pawregistry.co.za   ·   pawregistry.co.za",
                  ParagraphStyle("ctac", fontName="Helvetica-Bold", fontSize=10,
                                 textColor=colors.HexColor("#f0c080"), leading=14)),
    ]
]
cta_t = Table(cta_content, colWidths=[CW])
cta_t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), BRAND_DARK),
    ('LEFTPADDING', (0,0), (-1,-1), 22),
    ('RIGHTPADDING', (0,0), (-1,-1), 22),
    ('TOPPADDING', (0,0), (-1,-1), 20),
    ('BOTTOMPADDING', (0,0), (-1,-1), 20),
]))
story.append(cta_t)

# ── Build ──────────────────────────────────────────────────────────────────────
print("Building PDF…")
doc.build(story)
print(f"\nDone! PDF saved to:\n  {OUTPUT}")
