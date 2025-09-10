import axios from 'axios';

export const api = axios.create({
  baseURL:'http://localhost:4000',
   withCredentials: true,
  //headers: { 'ngrok-skip-browser-warning': '1' }
});
