# Deploy Internal CA via Group Policy (Windows) and MDM (Macs/mobile)

This guide shows how to deploy your internal CA to **all managed devices on the private network** so that **https://sustainability.kpndomain.com** is trusted automatically—no per-device manual install.

- **Windows (domain-joined):** Group Policy pushes the CA to **Trusted Root Certification Authorities**.
- **Macs / iOS / mobile (MDM-managed):** MDM pushes a configuration profile that installs and trusts the CA.

You need:
- The CA certificate file: `ca.crt` (from `/opt/Project-Management-V2.0/ca/certs/ca.crt` on the server, or your internal CA).
- **Windows:** Active Directory and rights to create/edit Group Policy.
- **Macs/mobile:** An MDM (e.g. Microsoft Intune, Jamf, Kandji) and ability to create configuration profiles.

---

## Part 1: Windows – Group Policy (GPO)

### 1.1 Put the CA certificate where domain controllers can read it

1. Copy `ca.crt` from the server to a **network share** that domain-joined PCs can read at boot/logon, e.g.:
   - `\\your-domain.com\NETLOGON\Certificates\KPN-Internal-Root-CA.crt`
   - or `\\fileserver\IT\Certificates\KPN-Internal-Root-CA.crt`
2. Ensure **Authenticated Users** (or **Domain Computers**) have **Read** access so the GPO can distribute the cert.

### 1.2 Create a GPO to deploy the root CA

1. On a machine with **Group Policy Management** (GPMC): **Start** → **Group Policy Management**.
2. Expand your domain and the OU that contains the **computer accounts** (or the whole domain if you want all PCs).
3. Right-click the OU (or domain) → **Create a GPO in this domain, and Link it here**.
4. Name it e.g. **“Trust Internal Root CA – Sustainability”** → **OK**.

### 1.3 Add the “Trusted Root” certificate setting to the GPO

1. Right-click the new GPO → **Edit**.
2. Go to:  
   **Computer Configuration** → **Policies** → **Windows Settings** → **Security Settings** → **Public Key Policies**.
3. Right-click **Trusted Root Certification Authorities** → **Import…**.
4. In the Certificate Import Wizard:
   - Click **Next**.
   - **Browse** to the `ca.crt` file (use the UNC path, e.g. `\\your-domain.com\NETLOGON\Certificates\KPN-Internal-Root-CA.crt`). If the wizard doesn’t accept UNC, copy the file to a local path first, import, then the GPO will store the cert inside the GPO.
   - Click **Next**.
   - Ensure the store is **Trusted Root Certification Authorities** → **Next** → **Finish**.
5. You should see your CA listed under **Trusted Root Certification Authorities**.
6. Close the Group Policy editor.

### 1.4 Scope the GPO (who gets the CA)

- The GPO is applied to computers in the **OU (or domain)** where you linked it. Move computer accounts into that OU, or link the GPO to the domain / another OU as needed.
- To exclude some PCs: use **Security Filtering** (remove “Authenticated Users” and add only the groups that should get the CA) or **WMI filter** (advanced). Default: all computers in the OU/domain get the CA.

### 1.5 Apply the GPO

- **New/restarted PCs:** They get the GPO at next boot.
- **Existing PCs:** Either wait for next reboot, or force update:
  ```cmd
  gpupdate /force
  ```
  Run as admin on a test PC, then check that the CA appears in **Trusted Root Certification Authorities** (see 1.6).

### 1.6 Verify on a Windows PC

1. **Run** → `certmgr.msc` (current user) or `gpedit.msc` → Computer Configuration → Windows Settings → Security Settings → Public Key Policies → Trusted Root Certification Authorities (for computer store).
   - Or: **Run** → `mmc` → File → Add/Remove Snap-in → **Certificates** → **Computer account** → **Local computer** → **Trusted Root Certification Authorities**.
2. Confirm your **KPN Internal Root CA** (or whatever name you gave) is listed.
3. Open **https://sustainability.kpndomain.com** in **Chrome** or **Edge** — it should show as trusted (no warning).  
   **Firefox** uses its own store; see Part 3 if you need Firefox.

---

## Part 2: Macs and mobile (MDM)

MDM products differ, but the idea is the same: push a **configuration profile** that contains (or references) the CA and marks it as trusted for SSL.

### 2.1 Get the CA in the right format

- Your `ca.crt` is PEM. Most MDMs accept:
  - **PEM** (`.crt` / `.pem`), or
  - **DER** (binary). Convert if needed:
    ```bash
    openssl x509 -in ca.crt -outform DER -out ca.der
    ```
- Some MDMs want the cert **inside** a signed `.mobileconfig` (macOS/iOS) or an equivalent profile format.

### 2.2 Typical steps in the MDM (high level)

1. **Create a new configuration profile** (e.g. “Trust Internal Root CA”).
2. **Payload type:** choose **Certificates** (or **Credential / Root certificate**).
3. **Upload** the CA file (`ca.crt` or `ca.der`) and set **trust** for:
   - **SSL (TLS)** / “Use for TLS” so Safari and apps that use the system keychain trust it.
4. **Assign** the profile to the right device group (e.g. “All company Macs” or “Sustainability portal users”).
5. **Push** or require the profile; devices will install it at next check-in.

### 2.3 Product-specific pointers

- **Microsoft Intune (macOS):**  
  **Devices** → **Configuration** → **Create** → **macOS** → **Trusted Certificate** (template) or **Custom** (PKCS or SCEP). Upload the root CA and assign to groups.

- **Jamf (macOS/iOS):**  
  **Configuration Profiles** → **New** → add **Certificate Payload** (upload CA), enable trust for **SSL**.

- **Kandji, Addigy, etc.:**  
  Look for “Certificate” or “Trusted Root” payload; upload `ca.crt` and enable SSL trust.

After the profile is installed, **Safari** and **Chrome** on those Macs/iOS devices will trust https://sustainability.kpndomain.com. **Firefox** on Mac still needs its own step if you use it (Part 3).

---

## Part 3: Firefox (if used on Windows or Mac)

Firefox does **not** use the Windows or macOS trust store. So even after GPO (Windows) or MDM (Mac), Firefox will still show a warning unless you add the CA in Firefox.

**Options:**

1. **Firefox policy (recommended for “network” deployment):**  
   Use **Firefox Enterprise Policies** to add the CA. You need to:
   - Host a `policies.json` (or use Windows GPO “Administrative Templates” for Firefox if available).
   - In the policy, add your CA to the list of **Certificates → Authorities** (see [Mozilla Enterprise docs](https://support.mozilla.org/en-US/kb/customizing-firefox-using-group-policy-windows)).
   - Deploy that policy via GPO (Windows) or MDM/config profile (Mac) so all managed Firefox installs get the CA. That way “implementation” stays central (GPO/MDM), not per device.

2. **Manual per device:**  
   Each user: Firefox → Settings → Certificates → Authorities → Import `ca.crt` and trust for websites. Not ideal if you want zero per-device work.

3. **Skip Firefox:**  
   If internal policy is “use Chrome/Edge only,” then GPO (Windows) + MDM (Mac) is enough and you don’t need to touch Firefox.

---

## Summary

| Platform        | Method                    | Effect |
|----------------|---------------------------|--------|
| Windows (domain) | GPO → Trusted Root Certification Authorities | All domain PCs in scope get the CA; Chrome/Edge trust the site. |
| Macs / mobile  | MDM → Configuration profile with CA + SSL trust | All managed devices get the CA; Safari/Chrome trust the site. |
| Firefox        | Firefox policy (GPO/MDM) or manual import     | Only needed if users use Firefox; policy keeps it central. |

Once the CA is deployed this way, **every managed device on the private network** will trust **https://sustainability.kpndomain.com** without anyone installing the certificate on their own laptop. That is the “implementation on the private network” you’re aiming for.
