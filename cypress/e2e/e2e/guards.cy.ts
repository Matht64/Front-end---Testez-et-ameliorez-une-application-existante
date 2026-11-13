
const API_URL = 'http://localhost:8080/api';

interface TestUser {
  firstName: string;
  lastName: string;
  login: string;
  password: string;
}

function createTestUser(): TestUser {
  return {
    firstName: 'Cypress',
    lastName: 'GuardTester',
    login: `guard_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    password: 'TestPassword123!'
  };
}

// Create a real account and retrieve its JWT.
function registerAndLogin(): Cypress.Chainable<string> {
  const user = createTestUser();

  return cy.request({
    method: 'POST',
    url: `${API_URL}/register`,
    body: user
  })
    .then((registerResponse) => {

      expect(registerResponse.status).to.be.within(200, 299);

      return cy.request({
        method: 'POST',
        url: `${API_URL}/login`,
        body: {
          login: user.login,
          password: user.password
        }
      });

    })
    .then((response) => {

      expect(response.status).to.equal(200);

      const token = response.body.trim();

      expect(token).to.be.a('string').and.not.be.empty;

      return token;

    });
}

describe('Angular route guards E2E tests', () => {

  // =====================================
  // AUTH GUARD
  // =====================================

  it('should redirect unauthenticated users to login', () => {

    cy.visit('/students');

    cy.url().should('include', '/login');

    cy.url().should('include', 'returnUrl');

    cy.contains('Login').should('be.visible');

  });


  it('should allow authenticated users to access students', () => {

    registerAndLogin().then((token) => {

      cy.visit('/students', {
        onBeforeLoad: (window) => {
          window.localStorage.setItem('token', token);
        }
      });

      cy.url().should('include', '/students');

      cy.contains('Student Management')
        .should('be.visible');

    });

  });


  // =====================================
  // GUEST GUARD
  // =====================================

  it('should redirect authenticated users away from login', () => {

    registerAndLogin().then((token) => {

      cy.visit('/login', {
        onBeforeLoad: (window) => {
          window.localStorage.setItem('token', token);
        }
      });

      cy.url().should('include', '/students');

      cy.contains('Student Management')
        .should('be.visible');

    });

  });


  it('should redirect authenticated users away from register', () => {

    registerAndLogin().then((token) => {

      cy.visit('/register', {
        onBeforeLoad: (window) => {
          window.localStorage.setItem('token', token);
        }
      });

      cy.url().should('include', '/students');

      cy.contains('Student Management')
        .should('be.visible');

    });

  });


  // =====================================
  // HOME GUARD
  // =====================================

  it('should redirect unauthenticated users from home to login', () => {

    cy.visit('/');

    cy.url().should('include', '/login');

  });


  it('should redirect authenticated users from home to students', () => {

    registerAndLogin().then((token) => {

      cy.visit('/', {
        onBeforeLoad: (window) => {
          window.localStorage.setItem('token', token);
        }
      });

      cy.url().should('include', '/students');

      cy.contains('Student Management')
        .should('be.visible');

    });

  });


  // =====================================
  // EXPIRED TOKEN
  // =====================================

  it('should reject an expired JWT', () => {

    // JWT payload with an expiration date in the past.
    const expiredPayload = btoa(
      JSON.stringify({
        sub: 'cypress',
        exp: Math.floor(Date.now() / 1000) - 3600
      })
    );

    const expiredToken = `header.${expiredPayload}.signature`;

    cy.visit('/students', {
      onBeforeLoad: (window) => {
        window.localStorage.setItem('token', expiredToken);
      }
    });

    cy.url().should('include', '/login');

    cy.window().its('localStorage.token')
      .should('not.exist');

  });

});
