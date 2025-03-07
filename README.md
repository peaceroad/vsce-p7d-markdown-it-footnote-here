# vsce-p7d-markdown-it-footnote-here

This extension inserts footnotes just below paragraph in VS Code's built-in markdown preview.

The input Markdown and the output HTML are as follows.

You write the following Markdown.

```md
A paragraph.[^1]

[^1]: A footnote.

A paragraph.
```

In VS Code's built-in markdown preview, the value of the class attribute is added as follows.

```html
<p>A paragraph.<a href="#fn1" id="fn-ref1" class="fn-noteref" role="doc-noteref">[1]</a></p>
<aside id="fn1" class="fn" role="doc-footnote">
<p><a href="#fn-ref1" class="fn-backlink" role="doc-backlink">[1]</a> A footnote.</p>
</aside>
<p>A paragraph.</p>
```

This extension has a simple CSS to layout the footnotes.

![Figure](docs/footnote-screenshot.png)

---

Notice. You can remove the CSS that this extension applies by checking "P7d Markdown It Footnote Here: Disable Style" of the user settings.

---

## Use

It cannot coexist with VSCode's default footnote processing.
Therefore, before using this extension, turn off the default footnote processing. (Set VSCode Option -> Markdown Extended: Disabled Plugins: 'footnote')
