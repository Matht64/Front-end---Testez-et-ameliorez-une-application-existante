
const API_URL = 'http://localhost:8080/api';

interface TestUser {
  firstName: string;
  lastName: string;
  login: string;
  password: string;
}

// Create a unique account for each test.
function createTestUser(): TestUser {
  return {
    firstName: 'Cypress',
    lastName: 'LoginTester',
    login: `login_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    password: 'TestPassword123!'
  };
}

// Register the test account directly through the real backend.
function registerTestUser(): Cypress.Chainable<TestUser> {
  const user = createTestUser();

  return cy.request({
    method: 'POST',
    url: `${API_URL}/register`,
    body: user
  }).then((response) => {
    expect(response.status).to.be.within(200, 299);
    return user;
  });
}

describe('Real login E2E tests', () => {

  // =====================================
  // VALIDATION
  // =====================================

  it('should display required field errors', () => {

    cy.visit('/login');

    cy.contains('button', 'Login').click();

    cy.contains('Login is required.')
      .should('be.visible');

    cy.contains('Password is required.')
      .should('be.visible');

  });


  // =====================================
  // INVALID CREDENTIALS
  // =====================================

  it('should reject an incorrect password', () => {

    registerTestUser().then((user) => {

      cy.visit('/login');

      cy.get('#login').type(user.login);
      cy.get('#password').type('WrongPassword123!');

      cy.intercept('POST', '**/api/login')
        .as('loginRequest');

      cy.contains('button', 'Login').click();

      cy.wait('@loginRequest').then((interception) => {

        expect(interception.response!.statusCode)
          .to.be.oneOf([400, 401]);

      });

      cy.contains('Invalid login or password.')
        .should('be.visible');

      cy.url().should('include', '/login');

      cy.window().its('localStorage.token')
        .should('not.exist');

    });

  });


  // =====================================
  // SUCCESSFUL LOGIN AND ROUTE GUARD
  // =====================================

  it('should login and access the protected students page', () => {

    registerTestUser().then((user) => {

      // Try to access a protected page without a token.
      cy.visit('/students');

      // The authGuard should redirect us to login.
      cy.url().should('include', '/login');

      cy.url().should('include', 'returnUrl');

      // Enter valid credentials.
      cy.get('#login').type(user.login);
      cy.get('#password').type(user.password);

      cy.intercept('POST', '**/api/login')
        .as('loginRequest');

      cy.contains('button', 'Login').click();

      cy.wait('@loginRequest').then((interception) => {

        expect(interception.response!.statusCode)
          .to.equal(200);

        expect(interception.response!.body)
          .to.be.a('string')
          .and.not.be.empty;

      });

      // The user should return to the protected page.
      cy.url().should('include', '/students');

      cy.contains('Student Management')
        .should('be.visible');

      // Check that the JWT was saved.
      cy.window().then((window) => {

        const token = window.localStorage.getItem('token');

        expect(token).to.be.a('string').and.not.be.empty;

      });

    });

  });

});
