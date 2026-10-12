from __future__ import annotations

import io
import re
from collections import Counter
from typing import Any, Dict


SECTION_NAMES = {
    'summary': ('summary', 'profile', 'about me', 'objective', 'career objective'),
    'experience': ('experience', 'work experience', 'employment', 'professional experience'),
    'education': ('education', 'academic background', 'qualifications'),
    'skills': ('skills', 'technical skills', 'core competencies', 'technologies'),
    'achievements': ('achievements', 'accomplishments', 'awards', 'honors'),
    'projects': ('projects', 'personal projects', 'academic projects'),
    'certifications': ('certifications', 'licenses', 'courses'),
}

SKILL_CATALOG = [
    'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'sql', 'mongodb', 'postgresql',
    'react', 'node.js', 'express', 'next.js', 'django', 'flask', 'fastapi', 'spring',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'linux', 'tensorflow', 'pytorch',
    'machine learning', 'deep learning', 'data analysis', 'nlp', 'computer vision', 'rest api',
    'graphql', 'html', 'css', 'figma', 'agile', 'scrum', 'leadership', 'communication',
    'problem solving', 'project management', 'excel',
]


def extract_text(file_bytes: bytes, mime_type: str) -> str:
    if mime_type == 'application/pdf':
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        return '\n'.join(page.extract_text() or '' for page in reader.pages)
    if mime_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        from docx import Document
        document = Document(io.BytesIO(file_bytes))
        return '\n'.join(paragraph.text for paragraph in document.paragraphs)
    return file_bytes.decode('utf-8', errors='ignore')


def _clean_lines(text: str) -> list[str]:
    return [re.sub(r'\s+', ' ', line).strip() for line in text.splitlines() if line.strip()]


def _sections(lines: list[str]) -> Dict[str, list[str]]:
    sections: Dict[str, list[str]] = {'summary': []}
    current = 'summary'
    for line in lines:
        normalized = re.sub(r'[^a-z ]', '', line.lower()).strip()
        matched = next((key for key, names in SECTION_NAMES.items() if normalized in names), None)
        if matched:
            current = matched
            sections.setdefault(current, [])
        else:
            sections.setdefault(current, []).append(line)
    return sections


def _items(lines: list[str], limit: int = 12) -> list[str]:
    result = []
    for line in lines:
        value = re.sub(r'^[\-•*▪●\d.)\s]+', '', line).strip()
        if len(value) >= 3 and value not in result:
            result.append(value)
    return result[:limit]


def _skills(text: str, skill_lines: list[str]) -> list[str]:
    searchable = text.lower()
    found = [skill for skill in SKILL_CATALOG if re.search(rf'(?<![a-z0-9]){re.escape(skill)}(?![a-z0-9])', searchable)]
    explicit = []
    for line in skill_lines:
        explicit.extend(part.strip(' .:-').lower() for part in re.split(r'[,|;/]', line) if len(part.strip()) > 1)
    return list(dict.fromkeys(found + explicit))[:40]


def _objectives(summary: list[str], text: str) -> list[str]:
    objective_words = ('seeking', 'looking for', 'objective', 'goal', 'aim', 'aspire', 'career path', 'professional growth')
    candidates = [
        line for line in summary
        if any(word in line.lower() for word in objective_words)
    ]
    if not candidates:
        inline_objective = re.search(
            r'(?im)^(?:career\s+)?objective\s*[:\-]\s*(.+)$',
            text,
        )
        if inline_objective:
            candidates = [inline_objective.group(1).strip()]
    if not candidates and summary:
        candidates = summary[:2]
    return [
        re.sub(r'^(?:career\s+)?objective\s*[:\-]\s*', '', candidate, flags=re.IGNORECASE).strip()
        for candidate in candidates[:5]
        if candidate.strip()
    ]


def parse_resume(file_bytes: bytes, mime_type: str, filename: str = '') -> Dict[str, Any]:
    text = extract_text(file_bytes, mime_type)
    lines = _clean_lines(text)
    sections = _sections(lines)
    skills = _skills(text, sections.get('skills', []))
    achievements = _items(sections.get('achievements', []))
    experience = _items(sections.get('experience', []), 20)
    education = _items(sections.get('education', []), 10)
    projects = _items(sections.get('projects', []), 12)
    certifications = _items(sections.get('certifications', []), 10)
    objective = _objectives(sections.get('summary', []), text)
    years = [int(value) for value in re.findall(r'(?<!\d)(?:19|20)\d{2}(?!\d)', text)]
    seniority = 'senior' if any(word in text.lower() for word in ('senior', 'lead', 'principal', 'manager')) else 'mid-level' if years and max(years) - min(years) >= 3 else 'early-career'
    keywords = [word for word, _ in Counter(re.findall(r'[a-z][a-z+#.-]{3,}', text.lower())).most_common(30)]
    focus = list(dict.fromkeys([
        *skills[:8],
        *[item for item in achievements[:3] if len(item) < 120],
        *projects[:3],
    ]))[:15]
    return {
        'sourceFile': filename,
        'text': text[:30000],
        'skills': skills,
        'objectives': objective,
        'achievements': achievements,
        'experience': experience,
        'education': education,
        'projects': projects,
        'certifications': certifications,
        'keywords': keywords,
        'seniority': seniority,
        'interviewFocusAreas': focus,
        'status': 'parsed' if text.strip() else 'empty',
    }