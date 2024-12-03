const ENV = process.env.REACT_APP_ENV;
const config = {
  apiUrl: process.env.REACT_APP_API_URL as string,
  apiKey: process.env.REACT_APP_API_KEY as string,
  website: process.env.REACT_APP_WEBSITE as string, // rt or sailors
};

export default config;
