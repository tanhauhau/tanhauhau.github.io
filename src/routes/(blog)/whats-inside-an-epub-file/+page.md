---
title: What's inside an EPUB file?
date: '2026-11-07T08:00:00Z'
description: Unzip an EPUB, see how readers calculate pages, and follow how they save your place when the font size changes.
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

But if the chapter doesn't have fixed pages, where does "page 7 of 20" come from?

Let's imagine we're building a reader. We give each page a fixed width and height, and lay out the chapter in CSS columns. Each column becomes one page.

For a simplified horizontal layout with one page per screen and no column gap, we can calculate the number of pages like this:

```js
const pageWidth = 600;
const chapterWidth = 4200; // Measured after laying out the chapter

const pageCount = Math.ceil(chapterWidth / pageWidth); // 7
```

`chapterWidth` is the horizontal extent of the laid-out chapter, including its overflow. It isn't the width of the reader's visible window.

Now, increase the font size. The same chapter might occupy 6000 pixels instead:

```js
const pageCount = Math.ceil(6000 / 600); // 10
```

We haven't added any content. We've changed how much fits on each page.

A real reader also accounts for margins, column gaps, writing direction, and whether it shows two pages at once. You can see this approach in [epub.js's layout implementation](https://github.com/futurepress/epub.js/blob/master/src/layout.js), which measures page or spread lengths and rounds up the number required.

Those counts describe the current layout. Change the window size, font, line spacing, or margins, and the reader needs to calculate them again.

What about the page count for the whole book?

To count every rendered page accurately, we'd have to lay out every chapter under the same settings and add up the results. That can be expensive for a large book. A reader that lays out chapters only when needed may instead show a chapter count, or estimate the whole-book total from content lengths and the chapters it has measured. That's an implementation choice, and the estimate can change as more content is measured.

There's another approach: divide the content into locations that don't depend on the layout. For example, [epub.js can generate locations at character intervals](https://github.com/futurepress/epub.js/blob/master/src/locations.js):

```js
await book.locations.generate(1000);
```

Here, `1000` is a chosen interval for generating text locations. It isn't a rule in the EPUB format, and those locations aren't screen pages. Images and typography also mean a fixed amount of text won't always take the same amount of screen space.

Keeping those locations independent of layout gives the reader a way to calculate progress without repaginating the entire book.

And sometimes the EPUB already contains page references. Its navigation document can include an optional `page-list`, linking labels such as "42" to fixed points in the content, often corresponding to a print edition. Making the font bigger doesn't move those reference points, even if the content between two of them now occupies several screens. [EPUB page lists](https://www.w3.org/TR/epub-33/#sec-nav-pagelist).

So, when a reader shows a number, we need to know what it represents:

| Number                 | What it refers to                                  | Changes when the font size changes?                  |
| ---------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| Rendered page          | A page produced by the current layout              | Yes, it can                                          |
| Publication page label | A fixed reference point supplied in the book       | No                                                   |
| Generated location     | A point in a reader's content-based location index | No, if the content and indexing method stay the same |

Now, let's say we're on page 7 and close the reader. What should we save?

Saving `{ page: 7 }` sounds reasonable, until we open the book on a smaller screen. Page 7 could now contain a completely different paragraph.

Saving a scroll offset has the same problem. A paragraph that was 2000 pixels from the start might move after the font changes.

We need a reference to the content we were looking at.

EPUB has a scheme for this called a Canonical Fragment Identifier, or CFI. A text CFI describes a path through the publication into a document, down to a text node and an offset within that text. It doesn't depend on the font size. The offset counts UTF-16 code units, which matches how JavaScript strings and DOM Range offsets work. [EPUB CFI specification](https://w3c.github.io/epub-specs/epub33/epubcfi/).

For our example, an application might store a record like this:

```json
{
  "publicationId": "my-book:edition-1",
  "href": "EPUB/chapter1.xhtml",
  "cfi": "epubcfi(/6/2!/4/6/1:0)"
}
```

This is our application's record format. The CFI illustrates a point at the start of the second paragraph in our example chapter, assuming the usual package structure with metadata, manifest, and spine. In practice, let the reading engine generate it from the document.

But how does the reader know which text we're looking at?

In a browser-based implementation, the engine can walk the chapter's text nodes and inspect the rectangles of DOM Ranges. It finds where text intersects the visible page and converts a boundary into a content location. [epub.js's mapping code](https://github.com/futurepress/epub.js/blob/master/src/mapping.js) does this to find start and end CFIs for a visible page.

The start of the visible text is a useful default for resuming. It doesn't tell us the exact word the person is reading. A bookmark made from an explicit text selection can be more precise.

The app saves that location after a settled page turn or scroll, using its own storage, such as IndexedDB or an account's server-side reading history. Save as reading advances, rather than relying only on the app closing. The EPUB file doesn't need to be rewritten every time we turn a page. [Readium's locator model](https://readium.org/architecture/models/locators/) describes a similar separation, with a resource reference, locations within it, and optional surrounding text.

Keep the saved location associated with the same publication and edition. Changing font size leaves the document structure intact; replacing the book with a revised edition might not. Surrounding text can help find a location again when supported. A chapter-relative progression value can provide an approximate fallback, but it doesn't identify a sentence as precisely as a text anchor.

Now we can change the font size without losing our place.

Before changing it, capture the current content location. Apply the new settings, wait for the chapter to finish its new layout, resolve the saved location, and move to the page containing it.

As pseudocode, the sequence looks like this:

```js
// Conceptual reader API, not methods from a particular library.
const anchor = reader.firstVisibleLocation();

reader.pausePositionSaving();
await reader.applyPreferences({ fontSize: '130%' });
await reader.waitForLayout();
await reader.showLocation(anchor);
reader.resumePositionSaving();
```

Pausing automatic position saving matters. During the change, the engine might briefly display the start of the chapter. We don't want that temporary position to overwrite the place we're restoring. Resume saving settled locations once restoration has completed. If an awaited step fails, this sequence leaves saving paused; the app's error and navigation handling should keep the old saved anchor and resume saving when the user deliberately navigates.

`waitForLayout()` is doing real work here. The chapter's fonts and layout-affecting images need to be ready before we measure its new pages. In a web reader, `document.fonts.ready` helps wait for the fonts used by the chapter, but it doesn't wait for images. Use the chapter document's font set, which may belong to an iframe. An arbitrary timeout isn't a reliable substitute for the engine's layout lifecycle. [Waiting for document fonts](https://developer.mozilla.org/en-US/docs/Web/API/Document/fonts).

To implement `showLocation`, resolve the saved CFI to a DOM Range and measure that range in the new layout. In our simplified 600-pixel-wide pages, suppose the text is now at horizontal position 5500, measured from the chapter's laid-out origin. Its page index is `Math.floor(5500 / 600)`, which is 9, or page 10 when counting from 1. Move to the page's start at `9 * 600`, or 5400 pixels. Use chapter-relative coordinates here, not a viewport-relative rectangle without accounting for the current scroll offset.

The saved text might now be partway through page 10. That's fine. In a paginated reader, we restore the page containing that text. In a scrolling reader, we can scroll the resolved range into view. Reopening the book follows the same sequence: load the saved edition, apply the reader's preferences, lay out the chapter, then navigate to the saved content location.

There is one subtlety with "zoom", though.

Changing text size changes line wrapping. Browser page zoom can also change the available layout space. Mobile pinch zoom, on the other hand, can magnify the visual viewport without changing the layout viewport, so it doesn't necessarily create new line breaks or pages. [MDN explains these two viewports](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport).

If we want to restore the exact magnified view too, we need additional view state, such as the zoom scale and pan position relative to the content. The text anchor still tells us where we are in the book. It doesn't describe every detail of how we were viewing it.

Back to the archive, there's our tiny `mimetype` file. Its contents are exactly:

```text
application/epub+zip
```

When packaging the archive, this file must come first and must be stored without compression. Its contents must not have extra whitespace or a trailing newline. A small detail, but zipping a directory and changing its extension doesn't automatically produce a conforming EPUB. [EPUB packaging requirements](https://www.w3.org/TR/epub-33/#sec-zip-container-mime).

If you're generating one, [EPUBCheck](https://www.w3.org/publishing/epubcheck/) can check whether it follows the format's requirements.

And there you go. From the outside, you have one book file. Inside, you have content documents, styles, navigation, and a few instructions connecting them.

When the font size changes, the page number can change with it. The saved position still points to the text we wanted to keep reading.
