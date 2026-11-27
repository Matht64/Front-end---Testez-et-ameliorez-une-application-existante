
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
    lastName: 'RegisterTester',
    login: `register_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    password: 'TestPassword123!'
  };
}

describe('Real registration E2E tests', () => {

  // =====================================
  // VALIDATION
  // =====================================

  it('should display required field errors', () => {

    cy.visit('/register');

    cy.contains('button', 'Register').click();

    cy.contains('First Name is required')
      .should('be.visible');

    cy.contains('Last Name is required')
      .should('be.visible');

    cy.contains('Login is required')
      .should('be.visible');

    cy.contains('password is required')
      .should('be.visible');

  });


  // =====================================
  // SUCCESSFUL REGISTRATION
  // =====================================

  it('should register a new user successfully', () => {

    const user = createTestUser();

    cy.visit('/register');

    cy.get('input[formControlName="firstName"]')
      .type(user.firstName);

    cy.get('input[formControlName="lastName"]')
      .type(user.lastName);

    cy.get('input[formControlName="login"]')
      .type(user.login);

    cy.get('input[formControlName="password"]')
      .type(user.password);

    cy.intercept('POST', '**/api/register')
      .as('registerRequest');

    cy.contains('button', 'Register').click();

    cy.wait('@registerRequest').then((interception) => {

      expect(interception.response!.statusCode)
        .to.be.within(200, 299);

      expect(interception.request.body).to.deep.equal(user);

    });

    // Angular displays a native alert.
    cy.on('window:alert', (message) => {
      expect(message).to.equal('Registration successful!');
    });

    cy.url().should('include', '/login');

  });


  // =====================================
  // DUPLICATE LOGIN
  // =====================================

  it('should reject an already existing login', () => {

    const user = createTestUser();

    // First registration: create the account.
    cy.request({
      method: 'POST',
      url: `${API_URL}/register`,
      body: user
    }).then((response) => {

      expect(response.status).to.be.within(200, 299);

      // Second registration: reuse the same login.
      cy.visit('/register');

      cy.get('input[formControlName="firstName"]')
        .type(user.firstName);

      cy.get('input[formControlName="lastName"]')
        .type(user.lastName);

      cy.get('input[formControlName="login"]')
        .type(user.login);

      cy.get('input[formControlName="password"]')
        .type(user.password);

      cy.intercept('POST', '**/api/register')
        .as('duplicateRegister');

      cy.contains('button', 'Register').click();

      cy.wait('@duplicateRegister').then((interception) => {

        expect(interception.response!.statusCode)
        .to.equal(409);

      });

      cy.contains('This login is already taken.')
        .should('be.visible');

      cy.url().should('include', '/register');

    });

  });

});
