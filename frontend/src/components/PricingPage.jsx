import { useState } from 'react'
import { Check, Zap, Crown, Star, Gift } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function PricingPage() {
  const [billingCycle, setBillingCycle] = useState('monthly') // monthly or yearly

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for small businesses getting started with SEO',
      monthlyPrice: 9.99,
      yearlyPrice: 67.12, // 20% discount
      earlyBirdMonthly: 6.99,
      earlyBirdYearly: 53.70,
      credits: 500,
      features: [
        'Product title optimization (unlimited)',
        'Product description optimization (unlimited)', 
        'Basic SEO analysis',
        '5 language support',
        'Email support'
      ],
      popular: false,
      color: 'border-gray-200'
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'Most popular choice for growing businesses',
      monthlyPrice: 19.99,
      yearlyPrice: 143.92, // 20% discount
      earlyBirdMonthly: 14.99,
      earlyBirdYearly: 115.14,
      credits: 2000,
      features: [
        'Everything in Starter',
        '🆕 AI blog generation (with images)',
        'Bulk optimization tools',
        'Advanced SEO analysis',
        'Priority customer support',
        'Shopify integration'
      ],
      popular: true,
      color: 'border-blue-500 ring-2 ring-blue-200'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large businesses with advanced needs',
      monthlyPrice: 49.99,
      yearlyPrice: 383.92, // 20% discount
      earlyBirdMonthly: 39.99,
      earlyBirdYearly: 307.14,
      credits: 10000,
      features: [
        'Everything in Professional',
        'Unlimited AI image generation',
        'Dedicated account manager',
        'API access',
        'Custom integrations',
        'White-label options'
      ],
      popular: false,
      color: 'border-purple-200'
    }
  ]

  const creditsUsage = [
    { feature: 'Product title optimization', oldPrice: 25, newPrice: 5, savings: '80%' },
    { feature: 'Product description optimization', oldPrice: 50, newPrice: 10, savings: '80%' },
    { feature: 'Short blog (300-500 words)', oldPrice: 100, newPrice: 25, savings: '75%' },
    { feature: 'Medium blog (500-800 words)', oldPrice: 200, newPrice: 50, savings: '75%' },
    { feature: 'Long blog (800-1200 words)', oldPrice: 400, newPrice: 100, savings: '75%' },
    { feature: 'AI image generation', oldPrice: 150, newPrice: 30, savings: '80%' }
  ]

  const getPrice = (plan) => {
    const isYearly = billingCycle === 'yearly'
    const basePrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice
    const earlyBirdPrice = isYearly ? plan.earlyBirdYearly : plan.earlyBirdMonthly
    
    return {
      current: earlyBirdPrice,
      original: basePrice,
      monthly: isYearly ? (earlyBirdPrice / 12).toFixed(2) : earlyBirdPrice
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Badge className="bg-red-100 text-red-800 px-4 py-2 text-sm font-medium">
              🎉 Early Bird Special - Limited Time!
            </Badge>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your AI SEO Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            The most affordable AI-powered SEO tool with revolutionary image generation
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 mb-8">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                billingCycle === 'yearly' ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${billingCycle === 'yearly' ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              Yearly
            </span>
            {billingCycle === 'yearly' && (
              <Badge className="bg-green-100 text-green-800 ml-2">Save 20%</Badge>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => {
            const pricing = getPrice(plan)
            return (
              <Card key={plan.id} className={`relative ${plan.color} ${plan.popular ? 'scale-105' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-4 py-2">
                      <Star className="w-4 h-4 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <p className="text-gray-600 text-sm">{plan.description}</p>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-3xl font-bold text-gray-900">
                        ${pricing.current}
                      </span>
                      <span className="text-lg text-gray-500 line-through">
                        ${pricing.original}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {billingCycle === 'yearly' ? (
                        <>per year (${pricing.monthly}/month)</>
                      ) : (
                        <>per month</>
                      )}
                    </div>
                    <Badge className="bg-red-100 text-red-800 mt-2">
                      30% OFF Early Bird
                    </Badge>
                  </div>
                  
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-semibold text-gray-900">
                      {plan.credits.toLocaleString()} Credits/month
                    </div>
                    <div className="text-sm text-gray-600">
                      ~{Math.floor(plan.credits / 15)} products or {Math.floor(plan.credits / 80)} blogs
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    {plan.popular ? (
                      <>
                        <Crown className="w-4 h-4 mr-2" />
                        Start Free Trial
                      </>
                    ) : (
                      'Get Started'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Credits Pricing Table */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            Massive Price Reduction - Credits Now 75-80% Cheaper!
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Feature</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">Old Price</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">New Price</th>
                  <th className="text-center py-3 px-4 font-semibold text-green-600">Savings</th>
                </tr>
              </thead>
              <tbody>
                {creditsUsage.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-700">{item.feature}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-gray-500 line-through">{item.oldPrice} Credits</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-blue-600">{item.newPrice} Credits</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge className="bg-green-100 text-green-800">{item.savings}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Free Trial & Guarantees */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Gift className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Forever Free Plan</h3>
              <p className="text-gray-600 text-sm">
                50 Credits/month forever. Experience all features with no time limit.
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <Zap className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">14-Day Free Trial</h3>
              <p className="text-gray-600 text-sm">
                Full Professional plan access. 2000 Credits to test all features.
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <Check className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">30-Day Money Back</h3>
              <p className="text-gray-600 text-sm">
                Not satisfied? Get 100% refund, no questions asked.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Competitive Comparison */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-center mb-8">
            Why Choose AI SEO Master?
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Feature</th>
                  <th className="text-center py-3 px-4 font-semibold text-blue-600">AI SEO Master</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">TinyIMG</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">SearchPie</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">Smart SEO</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-700">Starting Price</td>
                  <td className="py-3 px-4 text-center font-semibold text-blue-600">$9.99</td>
                  <td className="py-3 px-4 text-center text-gray-600">$9.99</td>
                  <td className="py-3 px-4 text-center text-gray-600">$19</td>
                  <td className="py-3 px-4 text-center text-gray-600">$29.99</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-700">AI-Powered Optimization</td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-gray-400">✗</td>
                  <td className="py-3 px-4 text-center text-gray-400">✗</td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-700">🆕 AI Image Generation</td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-gray-400">✗</td>
                  <td className="py-3 px-4 text-center text-gray-400">✗</td>
                  <td className="py-3 px-4 text-center text-gray-400">✗</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-700">Multi-language SEO</td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-gray-400">✗</td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-gray-400">✗</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-700">Blog Generation</td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-gray-400">✗</td>
                  <td className="py-3 px-4 text-center text-gray-400">✗</td>
                  <td className="py-3 px-4 text-center text-gray-400">✗</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

