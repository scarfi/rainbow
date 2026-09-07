import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter(),
    paths: { base: process.env.BASE_PATH ?? '', relative: false },
  },
};
