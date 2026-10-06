# 上游产物夹具

这几份 JSON 是上游 skill 样例的**拷贝**，只给 `scripts/selftest.mjs` 当输入使用，让本 skill 单独拷走也能跑自测。

- `渡口-art.json` ← `novel-art/examples/渡口-art.json`
- `渡口-cast.json` ← `novel-characters/examples/渡口-cast.json`
- `渡口-outline.json` ← `novel-outline/examples/渡口-outline.json`
- `渡口-script.json` ← `novel-script/examples/渡口-script.json`

- 它们不是本 skill 的样例，不要在文档里当样例引用
- 上游样例改了字段，这里不会自动跟上。需要时整份重新拷贝，再跑自测
