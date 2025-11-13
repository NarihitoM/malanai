import { useState, useEffect, use } from "react";
import { useNavigate } from "react-router-dom";
import "./index.css";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";

function Signup() {
  const [text, settext] = useState("");
  const [email, setemail] = useState("");
  const [password, setpassword] = useState("");
  const [confirmpassword, setconfirmpassword] = useState("");
  const [bool, setbool] = useState(false);
  const [showterms, setshowterms] = useState(false);
  const [context, setcontext] = useState(false);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const navigate = useNavigate();

  const handlevalidation = async (e) => {
    e.preventDefault();
    if (email === "" && password === "" && confirmpassword === "") {
      settext("Please fill in all the fields");
    } else if (!emailRegex.test(email)) {
      settext("Please Enter a valid email");
    } else if (password !== confirmpassword) {
      settext("Password is incorrect");
    }
    else if (!context) {
      settext("Please check terms and conditions");
    } else {
      settext("Authenticating...");
      setbool(true);
      try {
        const response = await axios.post("https://malan-ai-db.vercel.app/api/signup", {
          email: email,
          password: password,
        });
        settext(response.data.message);
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } catch (error) {
        console.error(error);
        settext("Sign Up Failed");
      }
    }
  };

  const googlelogin = useGoogleLogin({
    onSuccess: async (response) => {
      if (!context) {
        settext("Please check terms and conditions");
        setbool(true);
        return;
      }
      settext("Authenticating...");
      setbool(true);
      try {
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${response.access_token}` },
        });
        const profile = await userInfoRes.json();
        const backendRes = await axios.post("https://malan-ai-db.vercel.app/api/google-login", {
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          googleId: profile.sub,
        });
        settext(backendRes.data.message);
        setbool(true);
        localStorage.setItem("googleemail", backendRes.data.email);
        localStorage.setItem("googleusername", backendRes.data.username);
        localStorage.setItem("googlepicture", backendRes.data.picture);
        localStorage.setItem("token", backendRes.data.token);
        localStorage.setItem("keepLoggedIn", JSON.stringify(true));
        console.log("Google picture URL:", backendRes.data.picture);
        setTimeout(() => {
          navigate("/chat");
        }, 3000);
      } catch (error) {
        console.error(error);
        settext("Google Sign Up Failed");
        setbool(true);
      }
    },
    onError: () => {
      settext("Google Sign Up Failed");
      setbool(true);
    },
  });


  useEffect(() => {
    if (email === "" && password === "" && confirmpassword === "") {
      setbool(true);
      settext("");
      return;
    }
    else if (!emailRegex.test(email)) {
      settext("Please Enter a valid email");
    } else if (password !== confirmpassword && confirmpassword !== "") {
      settext("Password is incorrect");
    } else {
      settext("");
    }
  }, [email, password, confirmpassword]);

  return (
    <>
      <div className="Body">
        <form className="Form2" onSubmit={handlevalidation}>
          <h1 className="h1">MaLan-Ai</h1>
          <h2 className="h1">Sign Up</h2>

          <input type="text" className="input" value={email} style={email === "" ? { border: "2px solid gray" } : { border: "2px solid " + (emailRegex.test(email) ? "green" : "red") }} onChange={(e) => setemail(e.target.value)} placeholder="Enter Email" />

          <input type="password" className="input" value={password} style={{ border: password === "" ? "2px solid gray" : password === confirmpassword ? "2px solid green" : "2px solid red" }} onChange={(e) => setpassword(e.target.value)} placeholder="Enter Password" />

          <input type="password" className="input" value={confirmpassword} style={{ border: confirmpassword === "" ? "2px solid gray" : password === confirmpassword ? "2px solid green" : "2px solid red" }} onChange={(e) => setconfirmpassword(e.target.value)} placeholder="Enter Confirm Password"
          />
          {bool && (<p className="p" style={{ color: text === "Account Successfully Created" || text === "Google Login Successful" ? "green" : "red" }} >{text}</p>)}
          <div className="row4"><input type="checkbox" value={context} onChange={(e) => setcontext(e.target.checked)} /><h3>I agree to <span class="terms" onClick={() => setshowterms(true)} >Terms and conditions</span></h3>
          </div>
          <button className="buttonlogin" type="submit">Create Account with MaLan-Ai</button>
          <button className="buttonlogin1" type="button" onClick={googlelogin}>
            <i class="fa-brands fa-google"></i> &nbsp; Login with Google
          </button>
          <div className="row2">
            <p className="p">Have an existing account?</p>
            <button className="buttonlogin" type="button" onClick={() => navigate("/login")} >Log In</button>
          </div>
        </form>
        {showterms &&
          (
            <div className="floating">
              <div className="floating-content">
                <h2>Terms & Conditions</h2>
                <ol type="I">
                  <li>Currently In Development</li>
                  <li>Malan-Ai can make certain mistakes.</li>
                  <li>Develop By MaLan-Ai Team(Narihito,Riae).</li>
                </ol>
                <button className="buttonlogin3" onClick={() => setshowterms(false)}>Close</button>
              </div>
            </div>
          )}
      </div>
    </>
  );
}

export default Signup;
