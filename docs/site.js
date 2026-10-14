const toggle = document.querySelector("#nav-toggle");
const navigation = document.querySelector("#site-nav");

toggle?.addEventListener("click", () => {
  const isOpen = navigation.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(isOpen));
  toggle.setAttribute("aria-label", isOpen ? "关闭导航" : "打开导航");
});

navigation?.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    navigation.classList.remove("open");
    toggle?.setAttribute("aria-expanded", "false");
    toggle?.setAttribute("aria-label", "打开导航");
  }
});
