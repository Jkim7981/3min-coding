# AI Material Review Support

## T3-16 Scope

- Check the real lesson material uploaded by the backend owner
- Review generated questions against the original lesson material
- Write a lightweight quality checklist
- Keep an issue list for follow-up fixes

## Material Review Checklist

- Does the generated question stay inside the lesson topic?
- Is the difficulty level appropriate for the lesson stage?
- Is the wording short and clear enough for beginners?
- Is the answer objectively correct?
- Does the hint help without giving away the full answer?
- Is the explanation useful after a wrong answer?
- For coding questions, is the blank location meaningful?
- For coding questions, is the expected output realistic?

## Issue Log Template

| ID  | Lesson         | Problem               | Severity | Suggested Fix                   |
| --- | -------------- | --------------------- | -------- | ------------------------------- |
| 1   | Example lesson | Question is off-topic | Medium   | Regenerate with narrower prompt |

## Review Notes

- Keep screenshots of the generated question and the original source material together.
- Mark repeated wording issues because they usually point to prompt problems.
- If multiple questions fail in the same way, report the pattern before listing individual items.
