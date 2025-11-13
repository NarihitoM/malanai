import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { GoogleOAuthProvider } from "@react-oauth/google";

 document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        alert("This Function Is Disabled");
 })

ReactDOM.createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId="1049755586928-v3vu7imnscl9cod3qq9vi6k43ohpsht4.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);