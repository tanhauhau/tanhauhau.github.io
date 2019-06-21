const path = require(`path`);
const { createFilePath } = require(`gatsby-source-filesystem`);

exports.createPages = ({ graphql, actions }) => {
  const { createPage } = actions;

  return graphql(
    `
      {
        allMarkdownRemark(
          filter: { frontmatter: { wip: { ne: true } } }
          sort: { fields: [frontmatter___date], order: DESC }
          limit: 1000
        ) {
          edges {
            node {
              fileAbsolutePath
              fields {
                slug
                type
                noteDate
                noteTitle
              }
              frontmatter {
                title
              }
            }
          }
        }
      }
    `
  ).then(result => {
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
    const others = [];
    posts.forEach(post => {
      if (post.node.fields.type === 'notes') {
        notes.push(post);
      } else {
        others.push(post);
      }
    });

    const lists = [notes, others];
    lists.forEach(list => {
      list.forEach((post, index) => {
        const component = componentMap[post.node.fields.type];
        const previous =
          index === list.length - 1 ? null : list[index + 1].node;
        const next = index === 0 ? null : list[index - 1].node;

        createPage({
          path: post.node.fields.slug,
          component,
          context: {
            ...post.node.fields,
            previous,
            next,
          },
        });
      });
    });

    return null;
  });
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

    if (postType === 'notes') {
      // create date and title out of filename
      const [_, date, noteTitle] = node.fileAbsolutePath.match(noteRegexp);
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
};
