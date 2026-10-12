from __future__ import annotations

import re
from typing import Any, Dict, Iterable


BEHAVIORAL_QUESTIONS = [
    {
        'topic': 'behavioral_teamwork',
        'question': 'Tell me about a time you worked as part of a team. What was your role, and how did you help the team succeed?',
        'expected_concepts': ['team role', 'collaboration', 'contribution', 'result'],
    },
    {
        'topic': 'behavioral_leadership',
        'question': 'Tell me about a time you took the lead on a task or project. How did you guide others and make decisions?',
        'expected_concepts': ['leadership', 'decision making', 'communication', 'result'],
    },
    {
        'topic': 'behavioral_pressure',
        'question': 'How do you handle pressure and competing deadlines? Please describe a specific situation and what you did.',
        'expected_concepts': ['prioritization', 'calm decision making', 'communication', 'result'],
    },
    {
        'topic': 'behavioral_conflict',
        'question': 'Describe a time you disagreed with a teammate or stakeholder. How did you handle the conflict and reach a resolution?',
        'expected_concepts': ['conflict', 'listening', 'resolution', 'result'],
    },
    {
        'topic': 'behavioral_feedback',
        'question': 'Tell me about a piece of difficult feedback you received. How did you respond, and what did you change afterward?',
        'expected_concepts': ['feedback', 'self awareness', 'improvement', 'result'],
    },
    {
        'topic': 'behavioral_adaptability',
        'question': 'Tell me about a time requirements or priorities changed unexpectedly. How did you adapt?',
        'expected_concepts': ['adaptability', 'prioritization', 'communication', 'result'],
    },
    {
        'topic': 'behavioral_ownership',
        'question': 'Describe a mistake or failure you experienced at work or during a project. How did you take ownership and recover?',
        'expected_concepts': ['ownership', 'accountability', 'recovery', 'learning'],
    },
]


def _unique(values: Iterable[Any]) -> list[str]:
    result = []
    seen = set()
    for value in values:
        text = str(value or '').strip()
        key = text.lower()
        if text and key not in seen:
            seen.add(key)
            result.append(text)
    return result


def build_topic_graph(resume: Dict[str, Any]) -> Dict[str, list[str]]:
    skills = _unique(resume.get('skills', []))
    projects = _unique(resume.get('projects', []))
    experience = _unique(resume.get('experience', []))
    education = _unique(resume.get('education', []))
    keywords = _unique(resume.get('keywords', []))
    focus = _unique(resume.get('interviewFocusAreas', []))
    return {
        'skills': skills,
        'projects': projects,
        'experience': experience,
        'education': education,
        'keywords': keywords,
        'focus': focus,
        'all': _unique([*skills, *projects, *experience, *education, *keywords, *focus]),
    }


def _mentioned_topics(answer: str, topics: Iterable[str]) -> list[str]:
    lowered = answer.lower()
    return [topic for topic in topics if topic.lower() in lowered]


def _quality(answer: str, expected: list[str], mentioned: list[str]) -> tuple[int, str, list[str]]:
    words = re.findall(r"[a-zA-Z][a-zA-Z+#.-]*", answer or '')
    score = min(45, len(words) * 2)
    if mentioned:
        score += 15
    if len(words) >= 45:
        score += 15
    if any(marker in answer.lower() for marker in ('because', 'trade-off', 'implemented', 'measured', 'tested', 'deployed', 'evaluation')):
        score += 15
    missing = [concept for concept in expected if concept.lower() not in answer.lower()]
    score -= min(20, len(missing) * 4)
    score = max(0, min(100, score))
    level = 'High' if score >= 75 else 'Medium' if score >= 50 else 'Low'
    return score, level, missing


def _topic_question(topic: str, difficulty: str, source: str) -> tuple[str, list[str]]:
    if difficulty == 'easy':
        return f"Can you explain how you used {topic} in your {source.lower()}?", ['purpose', 'basic implementation', 'result']
    if difficulty == 'hard':
        return f"What trade-offs, limitations, and production challenges did you face when using {topic} in your {source.lower()}?", ['trade-offs', 'limitations', 'evaluation', 'deployment']
    return f"How did you implement {topic} in your {source.lower()}, and how did you evaluate that it worked?", ['implementation', 'design choice', 'evaluation', 'result']


def _select_topic(graph: Dict[str, list[str]], asked: list[str], count: int) -> tuple[str, str]:
    used = {item.lower() for item in asked}
    distribution = ['summary', 'skills', 'skills', 'skills', 'skills', 'projects', 'skills', 'projects', 'behavioral', 'skills']
    bucket = distribution[min(count, len(distribution) - 1)]
    candidates = graph.get(bucket, []) if bucket != 'behavioral' else graph.get('all', [])
    candidates = [item for item in candidates if item.lower() not in used]
    if not candidates:
        candidates = [item for item in graph.get('all', []) if item.lower() not in used]
    if not candidates:
        return '', 'behavioral'
    return candidates[0], bucket


def _select_behavioral_question(asked: list[str]) -> Dict[str, Any]:
    used = {item.lower() for item in asked}
    for item in BEHAVIORAL_QUESTIONS:
        if item['topic'].lower() not in used:
            return {**item, 'follow_up': False, 'source': 'behavioral'}

    index = len([item for item in asked if item.lower().startswith('behavioral_')])
    return {
        **BEHAVIORAL_QUESTIONS[index % len(BEHAVIORAL_QUESTIONS)],
        'follow_up': False,
        'source': 'behavioral',
    }


def _question_for_first_turn(graph: Dict[str, list[str]], difficulty: str) -> Dict[str, Any]:
    topic = 'opening_introduction'
    question = (
        "Good day, and welcome to your AARAMBH mock interview. "
        "I will begin with a general introduction before asking about your experience. "
        "Please tell me about yourself."
    )
    expected = ['background', 'experience', 'skills', 'career goals']
    source = 'introduction'
    return {
        'topic': topic,
        'question': question,
        'expected_concepts': expected,
        'follow_up': False,
        'source': source,
    }


def generate_next(payload: Dict[str, Any]) -> Dict[str, Any]:
    resume = payload.get('resume_profile') or {}
    history = payload.get('history') or []
    answer = str(payload.get('answer') or '').strip()
    difficulty = str(payload.get('difficulty') or 'medium').lower()
    if difficulty not in {'easy', 'medium', 'hard'}:
        difficulty = 'medium'
    graph = build_topic_graph(resume)
    asked = [str(item.get('topic') or '') for item in history]
    question_number = len(history) + 1
    analysis = None

    if not history:
        selected = _question_for_first_turn(graph, difficulty)
    else:
        previous = history[-1]
        previous_topic = str(previous.get('topic') or 'the topic')
        expected = [
            str(item)
            for item in (previous.get('expected_concepts') or previous.get('expectedConcepts') or [])
        ]
        mentioned = _mentioned_topics(answer, graph['all'])
        quality_score, confidence_level, missing = _quality(answer, expected, mentioned)
        analysis = {
            'quality_score': quality_score,
            'confidence_level': confidence_level,
            'detected_topics': mentioned,
            'missing_concepts': missing,
            'follow_up_reason': (
                f"The answer needs more depth on {', '.join(missing[:2])}."
                if missing else f"The candidate discussed {previous_topic} and can move to a deeper resume-grounded topic."
            ),
        }
        resume_topics_asked = {topic.lower() for topic in asked if topic.lower() in {item.lower() for item in graph['all']}}
        resume_topics_exhausted = bool(graph['all']) and len(resume_topics_asked) >= len({item.lower() for item in graph['all']})
        previous_topic_count = sum(1 for topic in asked if topic.lower() == previous_topic.lower())
        should_follow_up = (
            (quality_score < 65 or bool(missing))
            and not resume_topics_exhausted
            and previous_topic.lower() in {item.lower() for item in graph['all']}
            and previous_topic_count <= 1
        )
        if should_follow_up:
            topic = previous_topic
            question = f"You mentioned {topic}. Could you go deeper and explain the implementation choice, one challenge you faced, and how you measured the result?"
            expected = ['implementation choice', 'challenge', 'evaluation', 'result']
            follow_up = True
        else:
            topic, bucket = _select_topic(graph, asked, len(history))
            if bucket == 'behavioral':
                behavioral = _select_behavioral_question(asked)
                topic = behavioral['topic']
                question = behavioral['question']
                expected = behavioral['expected_concepts']
                follow_up = behavioral['follow_up']
                source = behavioral['source']
            else:
                source = 'project' if bucket == 'projects' else 'resume'
                question, expected = _topic_question(topic, difficulty, source)
                follow_up = False
        selected = {
            'topic': topic,
            'question': question,
            'expected_concepts': expected,
            'follow_up': follow_up,
            'source': source if not should_follow_up else 'resume',
        }
        analysis['next_question'] = question

    return {
        'question_number': question_number,
        'difficulty': difficulty,
        'topic': selected['topic'],
        'question': selected['question'],
        'expected_concepts': selected['expected_concepts'],
        'follow_up': selected['follow_up'],
        'analysis': analysis,
        'topic_graph': {key: value for key, value in graph.items() if key != 'all'},
    }
