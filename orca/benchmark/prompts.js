const suffix = ' Write all the CSS in the same file and do not use any external libraries or CDNs.';

const prompts = [
  {
    id: 'pricing',
    request:
      'a modern pricing page for a fictional project-management app called "TaskFlow" with 3 pricing tiers (Free, Pro, Team). Highlight the Pro tier as the most popular. Each tier has a price, a short feature list with check marks and a sign-up button. Include a short header and a footer.'
  },
  {
    id: 'login',
    request:
      'a modern login page with email and password fields, a "remember me" checkbox, a "forgot password" link, a Sign In button and a "Continue with Google" button.'
  },
  {
    id: 'blog',
    request:
      'a blog article page: a site header, the article title, the author name and date, three paragraphs of real text with a subheading, and a sidebar listing 4 related articles.'
  },
  {
    id: 'product',
    request:
      'a product page for a pair of wireless headphones: a large product visual made with CSS gradients, the name, the price, a star rating, 4 key features and an "Add to cart" button.'
  },
  {
    id: 'menu',
    request:
      'a restaurant menu page for an Italian restaurant with 3 categories (Starters, Mains, Desserts), each with 3 dishes that have a name, a short description and a price.'
  },
  {
    id: 'faq',
    request:
      'an FAQ page for a web hosting company with 6 questions that expand and collapse using only HTML and CSS.'
  },
  {
    id: 'event',
    request:
      'a conference landing page with a hero section, a 3-day schedule laid out as a timeline, a speakers section with 4 speaker cards and a register button.'
  },
  {
    id: 'yoga',
    request: 'a landing page for a yoga studio.'
  },
  {
    id: 'contact',
    request:
      'a contact page with a contact form (name, email, subject, message) next to cards showing the address, phone number and opening hours.'
  },
  {
    id: 'weather',
    request:
      'a weather app screen showing the current temperature and conditions for a city, plus a 5-day forecast row.'
  }
];

module.exports = { prompts, suffix };