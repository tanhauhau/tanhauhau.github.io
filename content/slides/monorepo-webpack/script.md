---
firstly to make sure we are on the same page, i'll quickly recap on module resolution & installation,

then i'll talk about monorepo and problems and solutions we faced in webpack with our monorepo setup

---

module resolution and installation is
"two side of the same coin"

---

symbolic link - is a OS feature - that is like a portal
if you look into the link, you can find all the files that is in the target location, although you are still within the symlink

---

nodejs resolution follows symlink, 

---

# Monorepo

- when we have pkg a & pkg b within the same repository, and pkg a imports pkg b,
- we want pkg-b to be resolved to the version that is within the repository, rather than install from npm registry

- run scripts across packages, that understands dependency relationship

---

when we were looking at monorepo, back in 2018,
there were a few tools available back then

---

lerna is build on top of npm / yarn
it delegates the installation to them

if you are not using yarn workspace, what lerna would do is to figure out what needs to be installed from the registry, remove local packages from the package.json, and run npm/yarn install.
- when that's done, it will restore package.json && use symlink to link the packges together.

---

end result would look something like this

However if you are using yarn workspace / enabled hoisting

--- 

whenever a local package is being used, it gets hoisted up to the root level, so you dont have to use symlink whenever possible

however, u need to analyse through all the local package's package.json to be able to do the hoisting

whereas the former method of symlinking, you can do it locally to just one package.

---

- it's more of a organisational reasons, why we would want that.
- each pkg is one isolated feature, and we want to make sure it can be easily transferred away.
- unlike babel monorepo, where build tools are monorepo's root dependencies, 
what we want is a bit more extreme, each packages should includes its own dev deps, including jest, eslint, etc.

---

we have 3 platforms, pc, mobile, rn within the project, 

lerna + yarn allow us to install dependencies for only 1 platform, instead of workspace which requires a project wide view, which meant to have to install all of them at once.

---

underneath webpack, it uses enhanced-resolve

---

a developer working on xxx-utils decides to write test for it, 

