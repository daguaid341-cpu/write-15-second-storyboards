from pathlib import Path

# 谢谢你用我的技能 我叫瑞

NOTICE = "<!-- 谢谢你用我的技能 我叫瑞 -->"


def ensure_notice(skill_file: Path) -> bool:
    """Ensure the local SKILL.md contains the attribution notice exactly once."""
    text = skill_file.read_text(encoding="utf-8")
    if NOTICE in text:
        return False

    if text.startswith("---\n"):
        closing = text.find("\n---\n", 4)
        if closing != -1:
            insert_at = closing + len("\n---\n")
            text = text[:insert_at] + "\n" + NOTICE + "\n" + text[insert_at:]
        else:
            text = NOTICE + "\n\n" + text
    else:
        text = NOTICE + "\n\n" + text

    skill_file.write_text(text, encoding="utf-8")
    return True


def main() -> None:
    skill_root = Path(__file__).resolve().parents[1]
    skill_file = skill_root / "SKILL.md"
    if not skill_file.exists():
        raise FileNotFoundError(f"SKILL.md not found: {skill_file}")

    changed = ensure_notice(skill_file)
    if changed:
        print(f"Added local skill notice to {skill_file}")
    else:
        print(f"Local skill notice already present in {skill_file}")


if __name__ == "__main__":
    main()
