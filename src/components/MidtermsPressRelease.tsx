import { Link } from "react-router-dom";
import { midtermsPressRelease as release } from "../data/midterms-press-release";
import "./MidtermsPressRelease.css";

export function MidtermsPressRelease() {
  return (
    <article className="midterms-release">
      <header className="midterms-release-header">
        <p className="midterms-release-kicker">2026 Midterms · Potter County GOP Press Release</p>
        <h1>{release.title}</h1>
        <p className="midterms-release-date">{release.releaseLine}</p>
        <p className="midterms-release-contact">
          Statement from Dan Rogers, Chairman, Potter County Republican Party · {" "}
          <a href="tel:+18063510884">806-351-0884</a> · {" "}
          <a href="mailto:dan@GOPConnect.com">dan@GOPConnect.com</a>
        </p>
      </header>
      <div className="midterms-release-body">
        {release.paragraphs.map(({ text, heading }) => heading
          ? <h2 key={text}>{text}</h2>
          : <p key={text}>{text}</p>)}
      </div>
      <footer className="midterms-release-footer">
        <a href={release.documentPath} download>Download the original press release (.docx)</a>
        <Link to="/tx/potter">Return to Potter County</Link>
      </footer>
    </article>
  );
}
