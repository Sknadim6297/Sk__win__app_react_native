export default function PhoneShowcase({ news, modes = [], liveName }) {
  return (
    <div className="phones" aria-hidden="true">
      <div className="phone">
        <div className="phone-screen">
          <div className="phone-app">
            <div className="phone-header">
              <div className="left">
                <img className="logo" src="/logo.png" alt="" />
                WAREZONE
              </div>
              <div className="coin-pill">
                120 <img src="/coin.png" alt="" />
              </div>
            </div>
            <div className="phone-news">
              <span className="tag">LATEST</span>
              {news || 'Tournaments Are Back'}
            </div>
            <div className="phone-body">
              <div className="mini-card">
                <h4>My Contests</h4>
                <p>Upcoming · Live · Completed</p>
              </div>
              <div className="mini-grid">
                {(modes.slice(0, 4).length ? modes.slice(0, 4) : [{ name: 'CLASH SQUAD' }, { name: 'BATTLE ROYALE' }]).map(
                  (m, i) => (
                    <div
                      key={i}
                      className="mode-tile"
                      style={m.image ? { backgroundImage: `url(${m.image})` } : undefined}
                    >
                      <span>{m.name}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="phone">
        <div className="phone-screen">
          <div className="phone-app">
            <div className="phone-header">
              <div className="left">Contest Details</div>
            </div>
            <div
              className="card-banner"
              style={{ height: 110, backgroundImage: 'url(/banner.jpg)', margin: 10, borderRadius: 12 }}
            />
            <div className="phone-body">
              <div className="mini-card">
                <h4>{liveName || 'WAREZONE Match'}</h4>
                <p>Prize pool · Entry fee · Map</p>
              </div>
              <div className="mini-card" style={{ background: '#00b368', color: '#fff' }}>
                <h4>Join in app</h4>
                <p>Room ID stays private</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="phone">
        <div className="phone-screen">
          <div className="phone-app">
            <div className="phone-header">
              <div className="left">
                <img className="logo" src="/logo.png" alt="" />
                Wallet
              </div>
            </div>
            <div className="phone-body">
              <div className="mini-card" style={{ textAlign: 'center', padding: 22 }}>
                <img src="/coin.png" alt="" style={{ width: 42, height: 42, margin: '0 auto 8px' }} />
                <h4 style={{ fontSize: 22 }}>₹0</h4>
                <p>Add coins in the app</p>
              </div>
              <div className="mini-card">
                <h4>Transactions</h4>
                <p>Wins, entries, top-ups</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
