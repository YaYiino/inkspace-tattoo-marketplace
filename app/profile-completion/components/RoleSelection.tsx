import { UserType } from '@/lib/types'

interface RoleSelectionProps {
  onRoleSelect: (userType: UserType) => void
}

export function RoleSelection({ onRoleSelect }: RoleSelectionProps) {
  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Your Role
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Select the option that best describes you. This will help us customize your experience 
          and connect you with the right opportunities.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Artist Option */}
        <div
          onClick={() => onRoleSelect('artist')}
          className="group cursor-pointer bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
        >
          <div className="text-center">
            {/* Artist Icon */}
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
              I'm a Tattoo Artist
            </h3>
            
            <p className="text-gray-600 mb-4">
              Looking for studio space to work and showcase my art to potential clients
            </p>
            
            <div className="text-sm text-gray-500">
              <ul className="space-y-1">
                <li>• Create your artist profile</li>
                <li>• Upload your portfolio</li>
                <li>• Connect with studios</li>
                <li>• Get booked by clients</li>
              </ul>
            </div>
          </div>
          
          {/* Arrow Icon */}
          <div className="flex justify-center mt-6">
            <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors duration-200">
              <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Studio Owner Option */}
        <div
          onClick={() => onRoleSelect('studio')}
          className="group cursor-pointer bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
        >
          <div className="text-center">
            {/* Studio Icon */}
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
              I Own a Studio
            </h3>
            
            <p className="text-gray-600 mb-4">
              Want to rent out space to talented artists and grow my business
            </p>
            
            <div className="text-sm text-gray-500">
              <ul className="space-y-1">
                <li>• List your studio space</li>
                <li>• Set your hourly rates</li>
                <li>• Connect with artists</li>
                <li>• Maximize your income</li>
              </ul>
            </div>
          </div>
          
          {/* Arrow Icon */}
          <div className="flex justify-center mt-6">
            <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-green-100 flex items-center justify-center transition-colors duration-200">
              <svg className="w-4 h-4 text-gray-400 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Don't worry, you can always change this later in your account settings
        </p>
      </div>
    </div>
  )
}