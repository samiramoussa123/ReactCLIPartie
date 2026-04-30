import axios from "axios";

const ApiPublic = axios.create({
  baseURL: "http://10.136.182.83:8000/api",  
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  timeout: 10000,
});


export default ApiPublic;