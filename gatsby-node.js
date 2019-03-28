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
    };

    posts.forEach((post, index) => {
      const component = componentMap[post.node.fields.type];
      const previous =
        index === posts.length - 1 ? null : posts[index + 1].node;
      const next = index === 0 ? null : posts[index - 1].node;

      createPage({
        path: post.node.fields.slug,
        component,
        context: {
          type: post.node.fields.type,
          slug: post.node.fields.slug,
          previous,
          next,
        },
      });
    });

    return null;
  });
};

const regexp = new RegExp(`^${__dirname}/content/([^/]+)/`);

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions;

  if (node.internal.type === `MarkdownRemark`) {
    const value = createFilePath({ node, getNode });
    createNodeField({
      name: `slug`,
      node,
      value,
    });

    const postType = node.fileAbsolutePath.match(regexp)[1];
    createNodeField({
      name: `type`,
      node,
      value: postType,
    });
  }
};
