Name:           desktop-pet
Version:        @VERSION@
Release:        1%{?dist}
Summary:        Desktop Pet multi-character companion platform
License:        MIT
URL:            https://github.com/Userfrom1995/RandomLabs
BuildArch:      x86_64
Requires:       python3

%description
Desktop Pet companion platform: switchable multi-character catalog
with distinct personalities, an always-on-top overlay, a background
service mode with autostart, and a creator-pack framework. This
package ships the self-contained one-file binary plus a desktop
entry, icon, and a disabled-by-default XDG autostart unit (opt in
with `desktop-pet startup on --service`).

%install
mkdir -p %{buildroot}%{_bindir} \
  %{buildroot}%{_datadir}/applications \
  %{buildroot}%{_datadir}/icons/hicolor/scalable/apps \
  %{buildroot}%{_sysconfdir}/xdg/autostart
install -m 0755 %{_sourcedir}/desktop-pet %{buildroot}%{_bindir}/desktop-pet
install -m 0644 %{_sourcedir}/desktop-pet.desktop \
  %{buildroot}%{_datadir}/applications/desktop-pet.desktop
install -m 0644 %{_sourcedir}/desktop-pet.svg \
  %{buildroot}%{_datadir}/icons/hicolor/scalable/apps/desktop-pet.svg
install -m 0644 %{_sourcedir}/desktop-pet-autostart.desktop \
  %{buildroot}%{_sysconfdir}/xdg/autostart/desktop-pet.desktop

%files
%{_bindir}/desktop-pet
%{_datadir}/applications/desktop-pet.desktop
%{_datadir}/icons/hicolor/scalable/apps/desktop-pet.svg
%config(noreplace) %{_sysconfdir}/xdg/autostart/desktop-pet.desktop

%changelog
* Fri Oct 02 2026 RandomLabs <desktop-pet@example.com> - @VERSION@-1
- Release-track rpm recipe (single-source version from pet/__init__.py)
