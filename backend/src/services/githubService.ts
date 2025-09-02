import axios from 'axios';
import { GitHubPullRequest, GitHubCommit } from '../types';

export class GitHubService {
  private apiToken: string;
  private organization: string;
  private baseUrl = 'https://api.github.com';

  constructor() {
    this.apiToken = process.env.GITHUB_API_TOKEN || '';
    this.organization = process.env.GITHUB_ORGANIZATION || '';
  }

  private getHeaders() {
    return {
      'Authorization': `token ${this.apiToken}`,
      'Accept': 'application/vnd.github.v3+json'
    };
  }

  async getUserPullRequests(username: string, startDate: Date): Promise<GitHubPullRequest[]> {
    try {
      const query = `author:${username} created:>=${startDate.toISOString().split('T')[0]}`;
      
      const response = await axios.get(`${this.baseUrl}/search/issues`, {
        headers: this.getHeaders(),
        params: {
          q: `${query} type:pr org:${this.organization}`,
          sort: 'created',
          order: 'desc',
          per_page: 100
        }
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching GitHub PRs:', error);
      return [];
    }
  }

  async getUserReviews(username: string, startDate: Date): Promise<GitHubPullRequest[]> {
    try {
      const query = `reviewed-by:${username} created:>=${startDate.toISOString().split('T')[0]}`;
      
      const response = await axios.get(`${this.baseUrl}/search/issues`, {
        headers: this.getHeaders(),
        params: {
          q: `${query} type:pr org:${this.organization}`,
          sort: 'created',
          order: 'desc',
          per_page: 100
        }
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching GitHub reviews:', error);
      return [];
    }
  }

  async getUserCommits(username: string, repo: string, startDate: Date): Promise<GitHubCommit[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/repos/${this.organization}/${repo}/commits`, {
        headers: this.getHeaders(),
        params: {
          author: username,
          since: startDate.toISOString(),
          per_page: 100
        }
      });

      return response.data || [];
    } catch (error) {
      console.error('Error fetching GitHub commits:', error);
      return [];
    }
  }

  async getOrgRepos(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/orgs/${this.organization}/repos`, {
        headers: this.getHeaders(),
        params: {
          type: 'all',
          per_page: 100
        }
      });

      return response.data.map((repo: any) => repo.name) || [];
    } catch (error) {
      console.error('Error fetching organization repos:', error);
      return [];
    }
  }

  async getMergedPullRequests(username: string, startDate: Date): Promise<GitHubPullRequest[]> {
    try {
      const query = `author:${username} is:merged created:>=${startDate.toISOString().split('T')[0]}`;
      
      const response = await axios.get(`${this.baseUrl}/search/issues`, {
        headers: this.getHeaders(),
        params: {
          q: `${query} type:pr org:${this.organization}`,
          sort: 'created',
          order: 'desc',
          per_page: 100
        }
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching merged PRs:', error);
      return [];
    }
  }
}