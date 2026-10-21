// The blue band with black and white stripes and the overlapping logo, as on reidarshockey.com.
function Header({ LinkHref, LinkText }: { LinkHref: string, LinkText: string }) {
  return (
    <header className="band">
      <span className="band-cutout band-cutout-left" />
      <a className="band-logo" href="#">
        <img src="logo480.png" alt="Reidars" width={480} height={346} />
      </a>
      <h1>Torstai Roster</h1>
      <a className="band-link" href={LinkHref}>{LinkText}</a>
      <span className="band-cutout band-cutout-right" />
    </header>
  );
}

export default Header
