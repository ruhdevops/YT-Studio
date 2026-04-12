fetch("data/videos.json")
  .then(res => res.json())
  .then(videos => {
    const grid = document.getElementById("video-grid");

    videos.forEach(video => {
      const videoId = new URL(video.url).searchParams.get("v");

      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <h3>${video.title}</h3>
        <iframe width="100%" height="200"
          src="https://www.youtube.com/embed/${videoId}"
          frameborder="0"
          allowfullscreen>
        </iframe>
      `;

      grid.appendChild(card);
    });
  });