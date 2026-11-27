# Plan de test — Frontend `etudiant-frontend`

## 1. Contexte et périmètre

Le frontend est une application **Angular 19** (Angular Material) de gestion des étudiants de la
bibliothèque. Périmètre testé :

- pages publiques : `/login`, `/register` ;
- page protégée : `/students` (CRUD des étudiants) ;
- navigation : **guards** d'authentification (redirections selon l'état du jeton) ;
- **intercepteur JWT** (ajout de l'en-tête `Authorization` aux requêtes API) ;
- services : `AuthService` (register / login / stockage du token / logout) et
  `StudentService` (CRUD HTTP des étudiants).

**Objectif du plan** : documenter et valider tous les cas de test du frontend, organisés selon la
pyramide de test. Chaque cas précise l'entrée (données de départ) et la sortie attendue.

## 2. Pyramide de test et outils

```
           /\
          /E2E\         Pile complète réelle : UI + backend + MySQL
         /------\       (Cypress, specs « e2e », npm run cy:real)
        / Intégr \      Vraie navigation dans un vrai navigateur,
       /----------\     API **simulée** par cy.intercept (sans backend)
      /  Unitaires \    Composants, services, intercepteur isolés
     /--------------\   (Jest + jest-preset-angular, services mockés)
```

| Niveau | Outils | Pré-requis | Commande |
|---|---|---|---|
| Unitaires | Jest + jest-preset-angular (services et HttpClient mockés) | Node.js, npm | `npm test` |
| Intégration | Cypress, specs `cypress/e2e/component-simulation/` | `ng serve` (port 4200) ; **pas de backend** | `npm run cy:mock` |
| E2E | Cypress, specs `cypress/e2e/e2e/` | `ng serve` **+ backend démarré** (Docker, port 8080) | `npm run cy:real` |

> Pour l'E2E et le backend, se reporter au *Plan de test — Backend* (même pile : MySQL Docker + Spring Boot).

## 3. Priorités des cas de test

Les cas sont classés de P1 à P3, du **plus simple au plus complexe** (ordre respecté dans les tableaux) :

| Priorité | Signification | Exemple |
|---|---|---|
| **P1** | Comportement de base (cas nominal) | Affichage du formulaire, appel API nominal |
| **P2** | Gestion des erreurs et de la validation | Formulaire invalide, erreur HTTP 500 |
| **P3** | Cas complexes et sécurité | URL de retour non fiable (open-redirect), jeton expiré, nettoyage mémoire |

---

## 4. Niveau 1 — Tests unitaires (80 cas, Jest)

Fichiers `src/app/**/*.spec.ts`. Les composants sont instanciés dans **TestBed** ; leurs
dépendances (services, routeur, HttpClient) sont des **mocks**. Certains cas sont paramétrés
avec `it.each` (un seul cas, plusieurs entrées) → **87 exécutions** au total.

### 4.1 `AppComponent` — `app.component.spec.ts` (3 cas)

| ID | Cas | Priorité | Entrée | Sortie attendue |
|---|---|---|---|---|
| U-F-AC-01 | Création de l'application | P1 | `TestBed.create()` | Le composant est instancié |
| U-F-AC-02 | Titre de l'application | P1 | — | Titre = `etudiant-frontend` |
| U-F-AC-03 | Point de montage des pages | P1 | — | Un `<router-outlet>` est présent dans le template |

### 4.2 Intercepteur JWT — `core/interceptors/jwt.interceptor.spec.ts` (2 cas)

| ID | Cas | Priorité | Entrée | Sortie attendue |
|---|---|---|---|---|
| U-F-JI-01 | Ajout du jeton aux requêtes API | P1 | Token présent dans localStorage ; requête GET vers l'API | En-tête `Authorization: Bearer <token>` ajouté à la requête |
| U-F-JI-02 | Requête sinon inchangée | P2 | Requête POST avec corps | La **méthode** et le **corps** de la requête ne sont pas modifiés |

### 4.3 `AuthService` — `core/service/auth.service.spec.ts` (15 cas)

| ID | Cas | Priorité | Entrée | Sortie attendue |
|---|---|---|---|---|
| U-F-AS-01 | Création du service | P1 | — | Service instancié |
| U-F-AS-02 | `register()` | P1 | Objet utilisateur complet | `POST /api/register` envoyé **avec** l'utilisateur |
| U-F-AS-03 | `login()` | P1 | login + mot de passe | `POST /api/login` envoyé, réponse de type texte attendue |
| U-F-AS-04 | Stockage du token | P1 | Réponse de connexion = `" token "` (avec espaces) | Token **nettoyé (trim)** et stocké dans localStorage |
| U-F-AS-05 | Erreur lors de la connexion | P2 | Réponse HTTP en erreur (4xx/5xx) | L'erreur est **propagée** ; rien n'est stocké |
| U-F-AS-06 | `getToken()` sans token | P1 | localStorage vide | `null` |
| U-F-AS-07 | `getToken()` avec token | P1 | Token déjà stocké | Le token est renvoyé |
| U-F-AS-08 | `isAuthenticated()` sans token | P1 | — | `false` |
| U-F-AS-09 | `isAuthenticated()` avec token valide | P1 | JWT bien formé, non expiré | `true` |
| U-F-AS-10 | Payload en base64url | P2 | Payload contenant `-`/`_` et sans padding | `true` (décodage correct) |
| U-F-AS-11 | Token expiré | P2 | `exp` dans le passé | `false` **+ token supprimé** de localStorage |
| U-F-AS-12 | Token expiré « pile maintenant » | P3 | `exp = maintenant` | `false` + token supprimé |
| U-F-AS-13 | Payload non du JSON valide | P2 | Payload corrompu | `false` + token supprimé |
| U-F-AS-14 | Payload non du base64 valide | P2 | Base64 invalide | `false` + token supprimé |
| U-F-AS-15 | `logout()` | P1 | Token stocké | Token **supprimé** + navigation vers `/login` |

### 4.4 `StudentService` — `core/service/student.service.spec.ts` (7 cas)

| ID | Cas | Priorité | Entrée | Sortie attendue |
|---|---|---|---|---|
| U-F-SS-01 | Création du service | P1 | — | Service instancié |
| U-F-SS-02 | `getAllStudents()` | P1 | Réponse 200 avec 2 étudiants | `GET /api/students` envoyé ; la liste est renvoyée |
| U-F-SS-03 | `getStudentById()` | P1 | id = 1 | `GET /api/students/1` envoyé ; l'étudiant est renvoyé |
| U-F-SS-04 | `createStudent()` | P1 | StudentRequest valide | `POST /api/students` envoyé **avec** le corps de la requête |
| U-F-SS-05 | `updateStudent()` | P1 | id + nouvelles valeurs | `PUT /api/students/{id}` envoyé avec le corps |
| U-F-SS-06 | `deleteStudent()` | P1 | id | `DELETE /api/students/{id}` envoyé |
| U-F-SS-07 | Erreur HTTP | P2 | Réponse 500 | L'erreur est **propagée** à l'abonné |

### 4.5 `LoginComponent` — `pages/login/login.component.spec.ts` (16 cas)

| ID | Cas | Priorité | Entrée | Sortie attendue |
|---|---|---|---|---|
| U-F-LC-01 | Création du composant | P1 | — | Composant instancié |
| U-F-LC-02 | Initialisation du formulaire | P1 | — | Champs login et password, vides |
| U-F-LC-03 | État initial | P1 | — | Formulaire invalide, non soumis, non « loading », sans erreur |
| U-F-LC-04 | Formulaire complet | P1 | Les deux champs remplis | `form.valid = true` |
| U-F-LC-05 | Soumission valide | P1 | Identifiants corrects | `AuthService.login()` appelé **avec** ces identifiants |
| U-F-LC-06 | Réussite → redirection par défaut | P1 | Réponse 200, pas de returnUrl | Navigation vers `/` |
| U-F-LC-07 | `onReset()` | P1 | — | Formulaire, drapeau soumis et message d'erreur réinitialisés |
| U-F-LC-08 | Validation : login vide | P2 | login = "" | Formulaire invalide (champ requis) |
| U-F-LC-09 | Validation : mot de passe vide | P2 | password = "" | Formulaire invalide (champ requis) |
| U-F-LC-10 | Soumission d'un formulaire invalide | P2 | Formulaire vide + clic submit | Formulaire marqué soumis/touched ; **aucun appel API** |
| U-F-LC-11 | État « loading » | P2 | Requête en cours | `loading = true` |
| U-F-LC-12 | Effacement d'une erreur précédente | P2 | Erreur affichée, puis nouvelle soumission | L'ancienne erreur est effacée |
| U-F-LC-13 | Redirection vers un returnUrl local | P2 | `returnUrl = /dashboard?tab=1` | Navigation vers cette URL |
| U-F-LC-14 | Échec de la connexion (paramétré ×3) | P2 | Erreur HTTP **401** / **0** (serveur inaccessible) / **500** | Message d'erreur adapté à chaque statut + `loading = false` + aucune navigation |
| U-F-LC-15 | returnUrl non fiable (paramétré ×4) | P3 | `//evil.com`, `https://evil.com`, `javascript:alert(1)`, `dashboard` | Navigation forcée vers `/` (**pas d'open-redirect**) |
| U-F-LC-16 | Nettoyage à la destruction | P3 | Requête en attente + composant détruit | L'abonnement RxJS est **fermé** |

### 4.6 `RegisterComponent` — `pages/register/register.component.spec.ts` (12 cas)

| ID | Cas | Priorité | Entrée | Sortie attendue |
|---|---|---|---|---|
| U-F-RC-01 | Création du composant | P1 | — | Composant instancié |
| U-F-RC-02 | Initialisation du formulaire | P1 | — | 4 champs : firstName, lastName, login, password |
| U-F-RC-03 | État initial | P1 | — | Non soumis, non « loading », sans erreur |
| U-F-RC-04 | Formulaire complet | P1 | Tous les champs remplis | Formulaire valide |
| U-F-RC-05 | Soumission valide | P1 | Données complètes | `AuthService.register()` appelé avec les valeurs du formulaire |
| U-F-RC-06 | Inscription réussie | P1 | Réponse 200 | Alerte affichée + navigation vers `/login` |
| U-F-RC-07 | `onReset()` | P1 | — | Formulaire, drapeau soumis et erreur réinitialisés |
| U-F-RC-08 | Champs requis (paramétré ×4) | P2 | Un seul champ vide à la fois | Formulaire invalide |
| U-F-RC-09 | Soumission d'un formulaire invalide | P2 | Formulaire vide + clic submit | Champs marqués touched ; **aucun appel API** |
| U-F-RC-10 | État « loading » | P2 | Requête en cours | `loading = true` |
| U-F-RC-11 | Échec de l'inscription | P2 | Erreur HTTP | Message d'erreur ; pas d'alerte, pas de navigation |
| U-F-RC-12 | Nettoyage à la destruction | P3 | Requête en attente + composant détruit | L'abonnement RxJS est fermé |

### 4.7 `StudentsComponent` — `pages/students/students.component.spec.ts` (25 cas)

| ID | Cas | Priorité | Entrée | Sortie attendue |
|---|---|---|---|---|
| U-F-ST-01 | Création du composant | P1 | — | Composant instancié |
| U-F-ST-02 | Initialisation du formulaire | P1 | — | 4 champs : firstName, lastName, email, age |
| U-F-ST-03 | Chargement à l'initialisation | P1 | — | `loadStudents()` est appelé au démarrage |
| U-F-ST-04 | Formulaire valide | P1 | Valeurs correctes (e-mail valide, âge ≥ 1) | Formulaire valide |
| U-F-ST-05 | Création : conversion des valeurs | P1 | Texte avec espaces, âge en texte | Valeurs **trimmées**, âge converti en nombre avant l'appel API |
| U-F-ST-06 | Création réussie | P1 | Réponse 201 | Nouvel étudiant **ajouté** à la liste + message + formulaire réinitialisé |
| U-F-ST-07 | Modification : remplacement dans la liste | P1 | Réponse 200 | `updateStudent()` appelé ; l'élément est remplacé dans la liste |
| U-F-ST-08 | `editStudent()` | P1 | Choix d'un étudiant à modifier | Mode édition : formulaire pré-rempli, messages effacés |
| U-F-ST-09 | `resetForm()` | P1 | — | Formulaire, drapeau soumis et id en édition réinitialisés |
| U-F-ST-10 | `logout()` | P1 | Clic Logout | Délégue à `AuthService.logout()` |
| U-F-ST-11 | État « loading » | P2 | Requête en cours | `loading = true` |
| U-F-ST-12 | Échec du chargement de la liste | P2 | Erreur HTTP | Message d'erreur par défaut affiché + `loading` arrêté |
| U-F-ST-13 | Champs requis | P2 | Formulaire vide | Les 4 champs sont requis |
| U-F-ST-14 | E-mail mal formé | P2 | `not-an-email` | Formulaire invalide |
| U-F-ST-15 | Âge trop faible | P2 | age = 0 | Formulaire invalide (minimum 1) |
| U-F-ST-16 | Soumission d'un formulaire invalide | P2 | Formulaire vide + clic Create | Champs marqués touched ; **aucun appel API** |
| U-F-ST-17 | Erreur à la création/modification | P2 | Erreur HTTP | Message d'erreur ; la liste n'est pas modifiée |
| U-F-ST-18 | Suppression de l'étudiant en cours d'édition | P2 | Confirmation de la suppression | Le formulaire est réinitialisé |
| U-F-ST-19 | Suppression d'un autre étudiant | P2 | Confirmation de la suppression d'un autre | Le mode édition est **conservé** |
| U-F-ST-20 | Échec de la suppression (API) | P2 | Erreur HTTP | Message d'erreur ; la liste est **conservée** |
| U-F-ST-21 | Échec de suppression inconnu | P2 | Erreur sans statut connu | Message d'erreur par défaut |
| U-F-ST-22 | Suppression annulée | P3 | L'utilisateur refuse la confirmation | Rien n'est appelé, rien n'est supprimé |
| U-F-ST-23 | Demande de confirmation | P3 | Clic Delete sur un étudiant | Boîte de confirmation mentionnant le **nom** de l'étudiant |
| U-F-ST-24 | Suppression confirmée | P3 | Confirmation acceptée | Étudiant retiré de la liste + message de succès |
| U-F-ST-25 | Nettoyage à la destruction | P3 | Sauvegarde en attente + composant détruit | L'abonnement RxJS est fermé |

---

## 5. Niveau 2 — Tests d'intégration (17 cas, Cypress « simulation »)

Spécialités : `cypress/e2e/component-simulation/` — exécutés avec `npm run cy:mock`.
L'application tourne dans un **vrai navigateur** avec de la **vraie navigation** (guards,
routeur, localStorage), mais l'API est **simulée** par `cy.intercept` (ou avec un faux JWT) :
aucun backend n'est nécessaire.

### 5.1 Guards — `guards.cy.ts` (5 cas)

| ID | Cas | Priorité | Entrée | Sortie attendue |
|---|---|---|---|---|
| I-F-GD-01 | Visiteur non authentifié → login | P1 | Pas de token ; visite de `/students` | Redirection vers `/login` **avec** `returnUrl` |
| I-F-GD-02 | Visiteur non authentifié depuis l'accueil | P1 | Pas de token ; visite de `/` | Redirection vers `/login` |
| I-F-GD-03 | Utilisateur authentifié qui arrive sur /login | P1 | Faux JWT non expiré dans localStorage ; visite de `/login` | Redirection vers `/students` |
| I-F-GD-04 | Utilisateur authentifié qui arrive sur /register | P1 | Faux JWT non expiré ; visite de `/register` | Redirection vers `/students` |
| I-F-GD-05 | Utilisateur authentifié depuis l'accueil | P1 | Faux JWT non expiré ; visite de `/` | Redirection vers `/students` |

### 5.2 Page de connexion — `login.cy.ts` (2 cas)

| ID | Cas | Priorité | Entrée | Sortie attendue |
|---|---|---|---|---|
| I-F-LO-01 | Affichage du formulaire | P1 | Visite de `/login` | Champs login, password et bouton Login visibles |
| I-F-LO-02 | Erreurs de validation | P2 | Soumission du formulaire vide | Messages « Login is required. » et « Password is required. » affichés |

### 5.3 Page d'inscription — `register.cy.ts` (3 cas)

| ID | Cas | Priorité | Entrée | Sortie attendue |
|---|---|---|---|---|
| I-F-RE-01 | Affichage du formulaire | P1 | Visite de `/register` | Les 4 champs et le bouton sont visibles |
| I-F-RE-02 | Erreurs de validation | P2 | Soumission du formulaire vide | Messages de champs requis affichés |
| I-F-RE-03 | Retour à la connexion | P1 | Clic sur « Back to login » | Navigation vers `/login` |

### 5.4 Page étudiants (API simulée) — `students.cy.ts` (7 cas)

| ID | Cas | Priorité | Entrée | Sortie attendue |
|---|---|---|---|---|
| I-F-ST-01 | Affichage de la page | P1 | Visite de `/students` avec token ; GET simulé (liste d'étudiants) | Titre « Student Management » + tableau rempli |
| I-F-ST-02 | Message de liste vide | P1 | GET simulé retourne une liste vide | Message « aucune donnée » affiché |
| I-F-ST-03 | Affichage du formulaire | P1 | Visite de la page | Les 4 champs du formulaire sont visibles |
| I-F-ST-04 | Erreurs de validation | P2 | Soumission du formulaire vide | Messages de champs requis affichés |
| I-F-ST-05 | Création d'un étudiant | P1 | Formulaire rempli + POST simulé (201) | L'étudiant apparaît dans la liste |
| I-F-ST-06 | Modification d'un étudiant | P1 | Mode édition + PUT simulé (200) | La ligne de la liste est mise à jour |
| I-F-ST-07 | Suppression après confirmation | P2 | Clic Delete + confirmation + DELETE simulé (204) | La ligne disparaît de la liste |

---

## 6. Niveau 3 — Tests E2E (17 cas, pile complète réelle)

Spécialités : `cypress/e2e/e2e/` — exécutés avec `npm run cy:real`.
Ces tests valident le **frontend ET le backend** de bout en bout : vraie navigation, vraies
requêtes HTTP vers `http://localhost:8080/api`, vrai MySQL. Chaque test crée un **compte
dépôt** via l'API, se connecte pour obtenir un vrai JWT, puis agit dans l'interface (et
nettoie les données qu'il a créées).

### 6.1 Guards — `guards.cy.ts` (7 cas)

| ID | Cas | Priorité | Entrée | Sortie attendue |
|---|---|---|---|---|
| E-F-GD-01 | Visiteur non authentifié → login | P1 | Pas de token ; visite de `/students` | Redirection vers `/login` avec returnUrl |
| E-F-GD-02 | Utilisateur authentifié accède à /students | P1 | Compte réel + vrai JWT ; visite de `/students` | La page étudiants s'affiche (pas de redirection) |
| E-F-GD-03 | Authentifié qui arrive sur /login | P1 | Vrai JWT ; visite de `/login` | Redirection vers `/students` |
| E-F-GD-04 | Authentifié qui arrive sur /register | P1 | Vrai JWT ; visite de `/register` | Redirection vers `/students` |
| E-F-GD-05 | Visiteur non authentifié depuis l'accueil | P1 | Pas de token ; visite de `/` | Redirection vers `/login` |
| E-F-GD-06 | Authentifié depuis l'accueil | P1 | Vrai JWT ; visite de `/` | Redirection vers `/students` |
| E-F-GD-07 | Refus d'un JWT expiré | P3 | JWT volontairement expiré dans localStorage ; visite de `/students` | Redirection vers `/login` |

### 6.2 Connexion — `login.cy.ts` (3 cas)

| ID | Cas | Priorité | Entrée | Sortie attendue |
|---|---|---|---|---|
| E-F-LO-01 | Erreurs de champs requis | P1 | Soumission du formulaire vide | Messages de champs requis affichés |
| E-F-LO-02 | Mot de passe incorrect | P2 | Compte réel + mauvais mot de passe | Requête API en erreur (400) ; message d'erreur affiché, pas de navigation |
| E-F-LO-03 | Connexion réussie → page protégée | P1 | Compte réel + bonnes identifiants | 200 + JWT stocké ; redirection vers `/students` et chargement de la liste |

### 6.3 Inscription — `register.cy.ts` (3 cas)

| ID | Cas | Priorité | Entrée | Sortie attendue |
|---|---|---|---|---|
| E-F-RE-01 | Erreurs de champs requis | P1 | Soumission du formulaire vide | Messages de champs requis affichés |
| E-F-RE-02 | Inscription réussie | P1 | Données valides, login unique | 201 ; l'utilisateur est créé dans la vraie base ; redirection vers `/login` |
| E-F-RE-03 | Login déjà existant | P2 | Re-inscription d'un login déjà utilisé | 400 de l'API ; message d'erreur affiché |

### 6.4 Gestion des étudiants — `student.cy.ts` (4 cas)

| ID | Cas | Priorité | Entrée | Sortie attendue |
|---|---|---|---|---|
| E-F-ST-01 | Affichage des étudiants réels | P1 | Compte authentifié ; liste depuis la vraie base | Page chargée : tableau d'étudiants ou message vide |
| E-F-ST-02 | Créer → modifier → supprimer un étudiant | P1 | Formulaire rempli dans l'interface | POST 201 → l'étudiant est visible ; PUT 200 avec les nouvelles valeurs ; DELETE 204 ; vérification **via l'API** que l'étudiant a disparu de la base |
| E-F-ST-03 | Rejet de données invalides | P2 | E-mail `not-an-email`, âge 0 | Messages de validation affichés ; **aucune** requête API |
| E-F-ST-04 | Déconnexion et verrouillage | P2 | Clic Logout sur la page étudiants | Navigation vers `/login` ; token retiré de localStorage ; nouvelle visite de `/students` redirigée vers `/login` |

---

## 7. Synthèse et critères de réussite

| Catégorie | Nb de cas | Emplacement | Commande |
|---|---|---|---|
| Unitaires | 80 (87 exécutions) | `src/app/**/*.spec.ts` | `npm test` |
| Intégration | 17 | `cypress/e2e/component-simulation/` | `npm run cy:mock` |
| E2E | 17 | `cypress/e2e/e2e/` | `npm run cy:real` |
| **Total** | **114** | | |

**Critères de réussite**

- `npm test` se termine **en vert** (aucun échec, aucun test ignoré) ;
- `npm run cy:mock` passe avec uniquement `ng serve` démarré (aucun backend requis) ;
- `npm run cy:real` passe avec la pile complète : Docker (MySQL) + backend (8080) + `ng serve` (4200) ;
- les 17 cas E2E couvrent aussi les API du backend (voir *Plan de test — Backend*, section 6).