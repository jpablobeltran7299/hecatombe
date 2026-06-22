const axios = require('axios');
const KEY = 'AIzaSyCs2ADJTtuygC7gumCbpSGCWBgpp0cHg1w';
const CX = 'e5e18ebc4aee847e6';

axios.get(`https://www.googleapis.com/customsearch/v1?key=${KEY}&cx=${CX}&q=funko+pop+spiderman&searchType=image&num=1`)
  .then(r => console.log(JSON.stringify(r.data, null, 2)))
  .catch(e => console.error(e.response?.data || e.message));
