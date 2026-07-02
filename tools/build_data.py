#!/usr/bin/env python3
"""content/curriculum.json から js/data.js を生成するビルドスクリプト。

使い方: python3 tools/build_data.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "content" / "curriculum.json"
DST = ROOT / "js" / "data.js"


def normalize(days):
    seen_terms = set()
    for item in days:
        c = item["content"]
        # アプリ側で "DAY n" バッジを表示するため、タイトルの "Day N:" は除去
        c["title"] = re.sub(r"^Day\s*\d+\s*[::]\s*", "", c["title"]).strip()
        # 用語集の重複は初出の日を優先して除去
        c["glossary"] = [
            g for g in c["glossary"]
            if not (g["term"] in seen_terms or seen_terms.add(g["term"]))
        ]
    return sorted(days, key=lambda d: d["day"])


def main():
    days = normalize(json.loads(SRC.read_text(encoding="utf-8")))
    body = json.dumps(days, ensure_ascii=False, indent=2)
    # U+2028/U+2029 はJSソース中で改行扱いになるためエスケープ
    body = body.replace(" ", "\\u2028").replace(" ", "\\u2029")
    DST.write_text(
        "/* 教材データ(自動生成)— 編集は content/curriculum.json へ。"
        "生成: python3 tools/build_data.py */\n"
        f"const CURRICULUM = {body};\n",
        encoding="utf-8",
    )
    total_quiz = sum(len(d["content"]["quiz"]) for d in days)
    total_terms = sum(len(d["content"]["glossary"]) for d in days)
    print(f"wrote {DST}: {len(days)} days, {total_quiz} quiz, {total_terms} terms")


if __name__ == "__main__":
    main()
