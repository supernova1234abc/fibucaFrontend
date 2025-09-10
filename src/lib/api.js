import axios from 'axios';

export const api = axios.create({
  baseURL: 'process.env.REACT_APP_URL' ||'http://localhost:4000',
   withCredentials: true,
  //headers: { 'ngrok-skip-browser-warning': '1' }
});
