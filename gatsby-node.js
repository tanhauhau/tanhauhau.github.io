const path = require(`path`);
const { createFilePath } = require(`gatsby-source-filesystem`);

exports.createPages = async ({ graphql, actions }) => {
  const { createPage } = actions;
  const result = await graphql(
    `
      {
        allMarkdownRemark(
          sort: { fields: [frontmatter___date], order: DESC }
          limit: 1000
        ) {
          edges {
            node {
              id
              fields {
                slug
                type
                noteDate
                noteTitle
                wip
              }
              frontmatter {
                title
              }
            }
          }
        }
      }
    `
  );
  if (result.errors) {
    throw result.errors;
  }

  // Create blog posts pages.
  const posts = result.data.allMarkdownRemark.edges;

  const componentMap = {
    blog: path.resolve(`./src/templates/blog-post.js`),
    talk: path.resolve(`./src/templates/talk-post.js`),
    notes: path.resolve(`./src/templates/note-post.js`),
  };

  // split into different lists
  const notes = [];
  const portfolios = [];
  const talks = [];
  const blogs = [];
  const others = [];
  const wips = [];
  posts.forEach(post => {
    if (post.node.fields.wip) {
      return wips.push(post);
    }

    switch (post.node.fields.type) {
      case 'notes':
        return notes.push(post);
      case 'portfolios':
        return portfolios.push(post);
      case 'talk':
        return talks.push(post);
      case 'blog':
        return blogs.push(post);
      default:
        return others.push(post);
    }
  });

  const lists = [notes, talks, blogs, others];
  for (list of lists) {
    for (const [index, post] of list.entries()) {
      const component = componentMap[post.node.fields.type];
      const previous = index === list.length - 1 ? null : list[index + 1].node;
      const next = index === 0 ? null : list[index - 1].node;

      createPage({
        path: post.node.fields.slug,
        component,
        context: {
          ...post.node.fields,
          heroImageUrl: await getHeroImage(post.node.id, 'hero.jpg'),
          heroTwitterImageUrl: await getHeroImage(post.node.id, 'hero-twitter.jpg'),
          previous,
          next,
        },
      });
    }
  }

  for (const post of wips) {
    const component = componentMap[post.node.fields.type];
    createPage({
      path: post.node.fields.slug,
      component,
      context: {
        ...post.node.fields,
        heroImageUrl: await getHeroImage(post.node.id, 'hero.jpg'),
        heroTwitterImageUrl: await getHeroImage(post.node.id, 'hero-twitter.jpg'),
        previous: null,
        next: null,
      },
    });
  }

  return null;

  async function getHeroImage(postId, filename) {
    const fileQuery = await graphql(
      `
        {
          markdownRemark(id: {eq: "${postId}"}) {
            parent {
              ... on File {
                relativeDirectory
              }
            }
          }
        }
      `
    );
    const folderPath = fileQuery.data.markdownRemark.parent.relativeDirectory;
    const heroImgPath = folderPath + '/' + filename;
    const imgQuery = await graphql(
      `{
        file(relativePath: {eq: "${heroImgPath}"}) {
          publicURL
        }
      }`
    );
    const img = imgQuery.data.file;
    if (!img) {
      return null;
    }
    return img.publicURL;
  }
};

const regexp = new RegExp(`^${__dirname}/content/([^/]+)/`);
const noteRegexp = new RegExp('(\\d{4}-\\d{2}-\\d{2})\\s+-\\s+(.+).md$');
const SLUG_PREFIX = { notes: '/notes' };

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions;

  if (node.internal.type === `MarkdownRemark`) {
    const postType = node.fileAbsolutePath.match(regexp)[1];

    const slugPrefix = SLUG_PREFIX[postType] || '';
    createNodeField({
      name: `slug`,
      node,
      value: slugPrefix + createFilePath({ node, getNode }),
    });

    createNodeField({
      name: `type`,
      node,
      value: postType,
    });

    createNodeField({
      name: 'wip',
      node,
      value: !!node.frontmatter.wip,
    });

    if (postType === 'notes') {
      // create date and title out of filename
      const noteRegexpMatch = node.fileAbsolutePath.match(noteRegexp);
      if (noteRegexpMatch) {
        const [_, date, noteTitle] = noteRegexpMatch;
        createNodeField({
          name: 'noteDate',
          node,
          value: date,
        });
        createNodeField({
          name: 'noteTitle',
          node,
          value: noteTitle,
        });
      }
    }

    if (postType === 'portfolios') {
      createNodeField({
        name: 'website',
        node,
        value: node.frontmatter.website,
      });
    }
  }
};
