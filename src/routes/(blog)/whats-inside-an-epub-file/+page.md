---
title: What's inside an EPUB file?
date: '2026-11-07T08:00:00Z'
description: Unzip an EPUB and follow how its content, styles, navigation, and reading order fit together.
tags:
  - EPUB
  - HTML
label: blog
---

If you have an `.epub` file, try opening it with an unzip tool:

```sh
unzip book.epub -d book
```

Yes, unzip.

An EPUB file is a ZIP archive containing the book's content and the information a reading app needs to put it together. The packaging follows a few extra rules, which we'll come back to later. [EPUB container format](https://www.w3.org/publishing/epub32/epub-ocf.html).

For a small book, the extracted files might look like this:

```text
book/
├── mimetype
├── META-INF/
│   └── container.xml
└── EPUB/
    ├── package.opf
    ├── nav.xhtml
    ├── chapter1.xhtml
    ├── chapter2.xhtml
    └── styles.css
```

Some of these files probably look familiar already.

Let's start with `chapter1.xhtml`:

```html
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
  <head>
    <title>The beginning</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <h1>The beginning</h1>
    <p>There was nothing unusual about the book.</p>
    <p>Until we unzipped it.</p>
  </body>
</html>
```

We have a heading, some paragraphs, and a stylesheet.

If you're a web developer, you can probably guess what happens next. The reading app renders the document and applies its CSS.

Notice the `.xhtml` extension. EPUB's HTML content documents use XHTML, so the markup needs to follow XML syntax. That explains the namespace on `<html>` and the self-closing `<link />`. A browser's willingness to recover from malformed HTML isn't something we should rely on here. [EPUB content documents](https://www.w3.org/publishing/epub32/epub-contentdocs.html).

Now, we have two chapter files. How does the reading app know which one comes first?

We could name them `chapter1.xhtml` and `chapter2.xhtml`, but those names are just our choice. Someone else could name their files `hello.xhtml` and `goodbye.xhtml`.

To find the reading order, we need to look at `package.opf`.

This is an XML document containing three important parts:

- **Metadata:** information about the book, such as its title, language, and identifier.
- **Manifest:** the resources that belong to the publication.
- **Spine:** the default reading order.

Here are simplified excerpts from the manifest and spine:

```xml
<manifest>
  <item
    id="chapter-one"
    href="chapter1.xhtml"
    media-type="application/xhtml+xml"
  />
  <item
    id="chapter-two"
    href="chapter2.xhtml"
    media-type="application/xhtml+xml"
  />
  <item
    id="navigation"
    href="nav.xhtml"
    media-type="application/xhtml+xml"
    properties="nav"
  />
  <item
    id="stylesheet"
    href="styles.css"
    media-type="text/css"
  />
</manifest>

<spine>
  <itemref idref="chapter-one" />
  <itemref idref="chapter-two" />
</spine>
```

The manifest gives each resource an ID. The spine refers to those IDs in order.

So, if we swap the two `itemref` elements, we've changed the default reading order without renaming either chapter.

Also notice that `styles.css` appears in the manifest but not the spine. It belongs to the book, but it isn't something you turn to and read. [EPUB packages](https://www.w3.org/publishing/epub32/epub-packages.html).

At this point, we know where the chapters are and how to order them. But how did the reading app find `package.opf` in the first place?

That's where `META-INF/container.xml` comes in:

```xml
<?xml version="1.0"?>
<container
  version="1.0"
  xmlns="urn:oasis:names:tc:opendocument:xmlns:container"
>
  <rootfiles>
    <rootfile
      full-path="EPUB/package.opf"
      media-type="application/oebps-package+xml"
    />
  </rootfiles>
</container>
```

It points to the package document.

`EPUB/` is a directory name we chose. The package document could live somewhere else; `container.xml` tells the reading app where to look. [Container document](https://www.w3.org/publishing/epub32/epub-ocf.html#sec-container-metainf-container.xml).

There's one more file in our example: `nav.xhtml`.

If the spine already provides the reading order, why do we need navigation?

Well, reading the next chapter and choosing a chapter from a menu are different actions.

The navigation document provides the table of contents. Inside its XHTML, we can have:

```html
<nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops">
  <h1>Contents</h1>
  <ol>
    <li><a href="chapter1.xhtml">The beginning</a></li>
    <li><a href="chapter2.xhtml">What happened next</a></li>
  </ol>
</nav>
```

Those links let the reader jump to a section. Remember the `properties="nav"` attribute in the manifest? That's how we identify this resource as the navigation document. [EPUB navigation](https://www.w3.org/TR/epub-33/#sec-nav).

Now, what about pages?

Our chapter contains paragraphs, but we haven't told it where page one ends.

For a reflowable EPUB, that's expected. The reading app lays out the content in the available space. Increase the font size, and fewer words fit on the screen. The same chapter now takes more screenfuls to read.

This is why a book can adapt to different screen sizes without the author preparing a separate layout for each device.

EPUB also supports fixed layouts, useful when the position of text and images is part of the content. So, reflowing is the default, but it isn't the only layout EPUB can represent. [EPUB layout overview](https://www.w3.org/TR/epub-overview-33/).

Finally, there's our tiny `mimetype` file. Its contents are exactly:

```text
application/epub+zip
```

When packaging the archive, this file must come first and must be stored without compression. Its contents must not have extra whitespace or a trailing newline. A small detail, but zipping a directory and changing its extension doesn't automatically produce a conforming EPUB. [EPUB packaging requirements](https://www.w3.org/TR/epub-33/#sec-zip-container-mime).

If you're generating one, [EPUBCheck](https://www.w3.org/publishing/epubcheck/) can check whether it follows the format's requirements.

And there you go. From the outside, you have one book file. Inside, you have content documents, styles, navigation, and a few instructions connecting them.

The next time a chapter appears in the wrong order, you know where to start looking.
