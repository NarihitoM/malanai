import { HashRouter as Router, Routes, Route,Navigate} from "react-router-dom";
import Login from "./auth/Login.jsx"
import Chat from "./chat/chat.jsx";
import Signup from "./auth/Signup.jsx"

function App() {
  const isLoggedin = JSON.parse(localStorage.getItem("keepLoggedIn"))
 return(
  <Router>
    <Routes>
      <Route path="/" element={isLoggedin ? <Navigate to={"/chat"}/>: <Login/>}/>
      <Route path="/login" element={<Login/>}/>
      <Route path="/chat" element={<Chat/>}/>
      <Route path="/signup" element={<Signup/>}/>
      <Route path="*" element={<h1>404 Error.</h1>} />
    </Routes>
  </Router>
  );
}

export default App
